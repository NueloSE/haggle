# Haggle — DoraHacks BUIDL draft (v0)

> Paste-ready text for the BUIDL form. Update the METRICS section and video link
> before final submission; everything else is stable.

## Name
Haggle

## One-liner (vision field)
Agents shouldn't shop at list price. Haggle runs a sealed-bid auction across every capable
agent on the CROO store, awards the job to the best bid (price × reputation × SLA), escrows,
verifies delivery, and hands back the result with an on-chain auction receipt showing every
bid, every transaction, and exactly what you saved.

## Tracks
Open – Any A2A Agents · Developer Tooling Agents

## Description

### The problem
The CROO Agent Store has 100+ priced services — but every buyer, human or agent, pays
list price to the first agent they find. Every orchestrator in this hackathon hires at
list price from a static registry. The one thing every real economy runs on is missing:
**price competition**.

### What Haggle does
Haggle is the market maker of the agent economy — a paid CAP agent (`run_auction`,
0.30 USDC) that is simultaneously a provider and a requester:

1. **Filter** — registry candidates matching your task's category and budget
2. **RFQ round** — real paid micro-orders to quote-capable agents; for everyone else,
   their list price stands as their sealed bid (the auction never lacks bidders)
3. **Score** — price × reputation × SLA fit, with a quality/price dial the buyer controls
4. **Award** — negotiate → escrow → verify → deliver; if the winner blows its SLA, escrow
   auto-refunds and Haggle re-routes to the runner-up at zero cost
5. **Verify (optional)** — `"verify": true` hires an independent verification agent from a
   *different* team to grade the winner's delivery before you see it
6. **Receipt** — every candidate, bid, score, order ID and tx hash, total spent, and your
   savings vs the highest and mean bids

### Why this is impossible on a normal API marketplace
Fixed prices, no wallets, no escrow, no per-call RFQs. On CAP, a quote is a paid on-chain
micro-order, the award is escrowed in CAPVault, and failed deliveries refund by contract —
so competitive award and free re-routing become protocol primitives. Price discovery is the
layer API marketplaces structurally cannot have.

### Why it's good for every other agent on the store
Haggle's registry spans 14+ agents from 10+ teams across research, DeFi intel, security,
content, and verification. Every job pays quote fees and awards across the network — Haggle
is deliberately the best-connected buyer in the hackathon. The audit cluster isn't our
competitor; it's our supply chain.

### Payment-state handling (the unglamorous 30%)
Full lifecycle on both sides of CAP: accept/reject negotiation, pay, deliver,
reject-with-refund when a job can't be filled, SLA-timeout awareness, idempotent retries,
and crash-safe job state — an interrupted auction reconciles from `listOrders` before it
ever spends again.

## METRICS (update before filing)
- Orders settled on Base mainnet: N (X as provider, Y as requester)
- Unique counterparty agents hired: N across N teams
- Unique buyer wallets: N
- Live receipts: link to state/jobs.json snapshots + basescan tx links

## Links
- Repo (MIT): https://github.com/NueloSE/haggle
- Agent on CROO Store: https://agent.croo.network/agents/a28b21af-6664-4e21-b0d9-bd12d5a1eacb
- Demo video (≤5 min): TODO
- SDK methods used: negotiateOrder, acceptNegotiation, rejectNegotiation, payOrder,
  deliverOrder, rejectOrder, getOrder, getNegotiation, getDelivery, listOrders,
  listNegotiations, connectWebSocket + all 8 event types

## Roadmap
- `proposedPrice` extension to CAP negotiation — native counter-offer bidding (Haggle's
  sealed-bid design proves the demand; today bids ride RFQ payloads because the protocol
  has no price field)
- Recurring auctions: "re-shop my daily briefing every morning"
- Buyer-funded auction budgets via fund-transfer services with percentage pricing
