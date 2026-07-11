import { AgentClient, DeliverableType } from '@croo-network/sdk';
import { randomUUID } from 'node:crypto';
import type { Bid, JobRequest, AuctionReceipt, RegistryEntry } from './types.js';
import { loadRegistry, candidatesFor } from './registry.js';
import { MAX_USDC_PER_JOB } from './config.js';

const RFQ_BUDGET_FRACTION = 0.15;      // never spend more than 15% of a job budget on quotes
const AWARD_TIMEOUT_GRACE_MS = 60_000; // extra wait beyond provider SLA before giving up

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function orderList(res: unknown): any[] {
  return Array.isArray(res) ? res : ((res as any)?.results ?? (res as any)?.data ?? []);
}

/**
 * Hire one service end-to-end as a requester, by REST polling (not a second
 * WebSocket): negotiate → wait for provider to accept → pay → poll to completion
 * → getDelivery. Polling avoids opening a second socket on an agent key whose
 * provider socket is already live (which drops events). Escrow refunds on
 * rejection/SLA-expiry are enforced on-chain, so a failed hire never loses funds.
 */
export async function hireService(
  client: AgentClient,
  serviceId: string,
  requirements: string,
  slaMinutes: number
): Promise<{ orderId: string; deliverable: string }> {
  const neg = await client.negotiateOrder({ serviceId, requirements });

  // 1) wait for the provider to accept → an order appears for this negotiation
  const acceptDeadline = Date.now() + 3 * 60_000;
  let orderId: string | undefined;
  while (Date.now() < acceptDeadline) {
    const n = await client.getNegotiation(neg.negotiationId);
    if (n.status === 'rejected') throw new Error('provider rejected negotiation');
    if (n.status === 'expired') throw new Error('negotiation expired (provider offline?)');
    if (n.status === 'accepted') {
      const found = orderList(await client.listOrders({ role: 'buyer', page: 1, pageSize: 50 }))
        .find(o => o.negotiationId === neg.negotiationId);
      if (found) { orderId = found.orderId; break; }
    }
    await sleep(2500);
  }
  if (!orderId) throw new Error('provider never accepted (not accepting orders)');

  // 2) wait for on-chain order creation to finalize (status: creating → created), then pay
  const payDeadline = Date.now() + 2 * 60_000;
  while (Date.now() < payDeadline) {
    const o = await client.getOrder(orderId);
    if (o.status === 'created') break;
    if (o.status === 'rejected') throw new Error('order rejected before payment');
    if (o.status === 'expired') throw new Error('order expired before payment');
    await sleep(2000);
  }
  await client.payOrder(orderId);   // escrow locks in CAPVault

  // 3) poll to settlement
  const completeDeadline = Date.now() + slaMinutes * 60_000 + AWARD_TIMEOUT_GRACE_MS;
  while (Date.now() < completeDeadline) {
    const o = await client.getOrder(orderId);
    if (o.status === 'completed') {
      const d = await client.getDelivery(orderId);
      return {
        orderId,
        deliverable: d.deliverableType === DeliverableType.Schema ? d.deliverableSchema : d.deliverableText,
      };
    }
    if (o.status === 'rejected') throw new Error('order rejected by provider (escrow refunded)');
    if (o.status === 'expired') throw new Error('order expired (escrow refunded)');
    await sleep(3000);
  }
  throw new Error(`SLA timeout on order ${orderId} (escrow auto-refunds)`);
}

/**
 * Downstream agents each define their own requirements schema. Since Haggle hires
 * arbitrary agents, it sends a JSON envelope populating the common field names so
 * most schemas find what they expect. A per-registry `requirementsTemplate` can
 * override this when an agent's exact schema is known.
 */
function buildRequirements(job: JobRequest, entry: RegistryEntry): string {
  if (entry.requirementsTemplate) {
    return JSON.stringify(
      Object.fromEntries(Object.entries(entry.requirementsTemplate).map(([k, v]) => [k, v === '$task' ? job.task : v]))
    );
  }
  return JSON.stringify({
    task: job.task, claim: job.task, text: job.task, query: job.task,
    input: job.task, content: job.task, category: job.category,
  });
}

/** RFQ round: paid micro-orders to quote-capable candidates; list price is the sealed bid for the rest. */
async function collectBids(client: AgentClient, job: JobRequest, candidates: RegistryEntry[]): Promise<Bid[]> {
  const rfqBudget = job.budgetUsdc * RFQ_BUDGET_FRACTION;
  let rfqSpent = 0;
  const bids: Bid[] = [];

  for (const entry of candidates) {
    const quotable = entry.quoteServiceId && (rfqSpent + (entry.quotePriceUsdc ?? 0.01)) <= rfqBudget;
    if (quotable) {
      try {
        const { orderId, deliverable } = await hireService(
          client,
          entry.quoteServiceId!,
          JSON.stringify({ rfq: true, task: job.task, category: job.category }),
          5
        );
        rfqSpent += entry.quotePriceUsdc ?? 0.01;
        const q = JSON.parse(deliverable);
        bids.push({
          entry,
          bidUsdc: Math.min(Number(q.bid_usdc) || entry.listPriceUsdc, entry.listPriceUsdc),
          source: 'rfq',
          rfqOrderId: orderId,
          etaMinutes: q.eta_minutes,
          confidence: q.confidence,
        });
        continue;
      } catch (err) {
        console.warn(`RFQ to ${entry.teamName} failed (${(err as Error).message}) — falling back to list price`);
      }
    }
    bids.push({ entry, bidUsdc: entry.listPriceUsdc, source: 'list-price' });
  }
  return bids;
}

/** score = wp·(price advantage) + wr·reputation + ws·SLA fit — higher wins */
function scoreBids(bids: Bid[], qualityWeight: number): Bid[] {
  const maxBid = Math.max(...bids.map(b => b.bidUsdc));
  const wq = Math.min(Math.max(qualityWeight, 0), 1);
  const wp = 1 - wq;
  for (const b of bids) {
    const priceAdv = maxBid > 0 ? 1 - b.bidUsdc / maxBid : 1;
    const reputation = (b.entry.completionRate ?? 0.5) * Math.min(1, Math.log10(1 + (b.entry.orderCount ?? 0)) / 2);
    const slaFit = 1 / (1 + b.entry.slaMinutes / 30);
    b.score = wp * priceAdv + wq * (0.7 * reputation + 0.3 * slaFit) + (b.confidence ?? 0) * 0.05;
  }
  return bids.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
}

/** The core: run a sealed-bid auction for one job, award, verify, return result + receipt. */
export async function runAuction(client: AgentClient, job: JobRequest): Promise<{ result: string; receipt: AuctionReceipt }> {
  const startedAt = new Date().toISOString();
  const jobId = randomUUID().slice(0, 8);
  const notes: string[] = [];
  const budget = Math.min(job.budgetUsdc, MAX_USDC_PER_JOB);
  if (budget < job.budgetUsdc) notes.push(`budget capped at ${MAX_USDC_PER_JOB} USDC by operator policy`);

  const candidates = candidatesFor(loadRegistry(), job.category, budget);
  if (candidates.length === 0) throw new Error(`no candidates in category "${job.category}" within budget ${budget} USDC`);

  const bids = scoreBids(await collectBids(client, job, candidates), job.qualityWeight ?? 0.4);

  // Award with re-route: try winner, then runner-up, then third.
  let awarded: { orderId: string; deliverable: string } | null = null;
  let winner: Bid | null = null;
  for (const bid of bids.slice(0, 3)) {
    try {
      console.log(`  award attempt → ${bid.entry.teamName} (${bid.entry.serviceName}) @ ${bid.bidUsdc} USDC`);
      awarded = await hireService(client, bid.entry.serviceId, buildRequirements(job, bid.entry), bid.entry.slaMinutes);
      console.log(`  ✅ ${bid.entry.teamName} delivered (order ${awarded.orderId})`);
      winner = bid;
      break;
    } catch (err) {
      const msg = (err as any)?.reason ?? (err as Error).message;
      console.log(`  ✗ ${bid.entry.teamName} failed: ${msg}`);
      notes.push(`re-route: ${bid.entry.teamName} failed (${msg})`);
    }
  }
  if (!awarded || !winner) throw new Error('all top bidders failed — job aborted, buyer will be refunded');

  if (!awarded.deliverable || awarded.deliverable.trim().length < 10) {
    notes.push('warning: deliverable suspiciously short');
  }

  // Optional: procure an independent audit of the delivery from a DIFFERENT team's
  // verification agent — Haggle buys trust from the market rather than judging itself.
  let verification: AuctionReceipt['verification'];
  if (job.verify) {
    const verifiers = candidatesFor(loadRegistry(), 'verification', budget)
      .filter(v => v.teamName !== winner.entry.teamName)
      .sort((a, b) => a.listPriceUsdc - b.listPriceUsdc);
    const verifier = verifiers[0];
    if (!verifier) {
      notes.push('verification requested but no independent verifier available within budget');
    } else {
      try {
        const v = await hireService(
          client,
          verifier.serviceId,
          JSON.stringify({ task: job.task, deliverable: awarded.deliverable.slice(0, 4000) }),
          verifier.slaMinutes
        );
        verification = {
          team: verifier.teamName,
          service: verifier.serviceName,
          verifyOrderId: v.orderId,
          costUsdc: verifier.listPriceUsdc,
          verdict: v.deliverable.slice(0, 500),
        };
      } catch (err) {
        notes.push(`verification failed (${(err as Error).message}) — delivery returned unverified`);
      }
    }
  }

  const mean = bids.reduce((s, b) => s + b.bidUsdc, 0) / bids.length;
  const max = Math.max(...bids.map(b => b.bidUsdc));
  const rfqSpend = bids.filter(b => b.source === 'rfq').reduce((s, b) => s + (b.entry.quotePriceUsdc ?? 0.01), 0);

  const receipt: AuctionReceipt = {
    jobId,
    task: job.task,
    category: job.category,
    budgetUsdc: budget,
    candidates: candidates.length,
    bids: bids.map(b => ({
      team: b.entry.teamName,
      service: b.entry.serviceName,
      bidUsdc: b.bidUsdc,
      source: b.source,
      score: Number((b.score ?? 0).toFixed(4)),
      rfqOrderId: b.rfqOrderId,
    })),
    winner: {
      team: winner.entry.teamName,
      service: winner.entry.serviceName,
      serviceId: winner.entry.serviceId,
      bidUsdc: winner.bidUsdc,
    },
    awardOrderId: awarded.orderId,
    verification,
    totalSpentUsdc: Number((winner.bidUsdc + rfqSpend + (verification?.costUsdc ?? 0)).toFixed(4)),
    savedVsMaxBidPct: Number((((max - winner.bidUsdc) / max) * 100).toFixed(1)),
    savedVsMeanBidPct: Number((((mean - winner.bidUsdc) / mean) * 100).toFixed(1)),
    startedAt,
    settledAt: new Date().toISOString(),
    notes,
  };

  return { result: awarded.deliverable, receipt };
}
