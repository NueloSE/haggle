/**
 * Haggle provider loop — sells `run_auction` on the CROO Agent Store.
 * NegotiationCreated → accept → OrderPaid → run sealed-bid auction → deliver result + receipt.
 * On any failure after payment: rejectOrder → CAPVault auto-refunds the buyer.
 */
import { AgentClient, DeliverableType, EventType } from '@croo-network/sdk';
import { sdkConfig, HAGGLE_SDK_KEY } from './config.js';
import { runAuction } from './auction.js';
import type { JobRequest } from './types.js';
import { appendJobLog } from './state.js';

const client = new AgentClient(sdkConfig, HAGGLE_SDK_KEY);

function parseJob(requirements: string): JobRequest {
  const r = JSON.parse(requirements);
  if (!r.task || !r.category || !r.budget_usdc) {
    throw new Error('requirements must be JSON: {"task", "category", "budget_usdc", "quality_weight"?}');
  }
  return {
    task: r.task,
    category: r.category,
    budgetUsdc: Number(r.budget_usdc),
    qualityWeight: r.quality_weight,
    verify: r.verify === true,
  };
}

async function main() {
  const stream = await client.connectWebSocket();
  console.log('🔨 Haggle provider online — waiting for jobs');

  stream.on(EventType.NegotiationCreated, async (e: any) => {
    console.log(`New negotiation ${e.negotiation_id}`);
    try {
      const neg = await client.getNegotiation(e.negotiation_id);
      console.log(`\n🎯 CAPTURED run_auction serviceId = ${neg.serviceId}\n   (requester ${neg.requesterAgentId})\n`);
    } catch { /* non-fatal: keep going to accept */ }
    try {
      const result = await client.acceptNegotiation(e.negotiation_id);
      console.log(`Accepted → order ${result.order.orderId}`);
    } catch (err) {
      console.error('accept failed:', err);
    }
  });

  stream.on(EventType.OrderPaid, async (e: any) => {
    const orderId = e.order_id;
    console.log(`💰 Order ${orderId} paid — running auction`);
    try {
      const order = await client.getOrder(orderId);
      const job = parseJob((await client.getNegotiation(order.negotiationId)).requirements);
      const { result, receipt } = await runAuction(client, job);

      await client.deliverOrder(orderId, {
        deliverableType: DeliverableType.Text,
        deliverableText: JSON.stringify({ result, receipt }, null, 2),
      });
      appendJobLog({ orderId, receipt });
      console.log(`✅ Delivered ${orderId} — winner ${receipt.winner.team} at ${receipt.winner.bidUsdc} USDC, saved ${receipt.savedVsMeanBidPct}% vs mean bid`);
    } catch (err) {
      console.error(`Auction failed for ${orderId}:`, err);
      try {
        await client.rejectOrder(orderId, `Haggle could not fill this job: ${(err as Error).message}. Escrow refunded.`);
        console.log(`↩️  Order ${orderId} rejected — escrow auto-refunds buyer`);
      } catch (rejectErr) {
        console.error('reject also failed (will retry via reconciliation):', rejectErr);
      }
    }
  });

  process.on('SIGINT', () => { stream.close(); process.exit(0); });
}

main().catch(console.error);
