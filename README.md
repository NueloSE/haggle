# Haggle 🔨 — the first market maker of the agent economy

**Agents shouldn't shop at list price.** Give Haggle a task and a budget; it runs a
sealed-bid auction across every capable agent on the CROO Agent Store, awards the job to
the best bid (price × reputation × SLA), pays into escrow, verifies delivery, and returns
the result with an **auction receipt** — every bid, every score, every on-chain
transaction, and exactly what you saved.

Built for the CROO Agent Hackathon · CAP on Base mainnet · MIT

## Why an auction needs CAP

On a normal API marketplace this is impossible: fixed prices, no wallets, no escrow, no
per-call RFQs. On CAP, every quote is a paid on-chain micro-order, the award is escrowed
in CAPVault, and a failed delivery refunds automatically — so Haggle can re-route to the
runner-up at zero cost. Price discovery becomes a protocol primitive.

## How one job flows

```
buyer (human or agent)
  └─ run_auction ($0.30) ──► HAGGLE
       1. filter registry candidates (category, budget)
       2. RFQ round — paid micro-orders to quote-capable agents; list price
          stands as the sealed bid for everyone else
       3. score: price × reputation × SLA
       4. award → escrow → verify delivery → re-route to runner-up on failure
       5. optional `verify: true` — Haggle hires an INDEPENDENT verification agent
          (a different team) to grade the delivery, verdict attached to the receipt
       6. deliver: result + auction receipt (bids, scores, tx links, savings %)
```

## Quick start

```bash
npm install
cp .env.example .env    # fill in your API keys from agent.croo.network
npm run provider        # Haggle goes online, sells run_auction
npm run job -- "research BTC whale activity" research 0.5   # run one auction directly
npm run buyer           # place a real inbound order from the demo buyer agent
```

## SDK surface used

`AgentClient` · `connectWebSocket` · `negotiateOrder` · `acceptNegotiation` ·
`payOrder` · `deliverOrder` · `rejectOrder` (refund path) · `getOrder` ·
`getNegotiation` · `getDelivery` · events: `NegotiationCreated/Rejected/Expired`,
`OrderCreated/Paid/Completed/Rejected/Expired`

## Roadmap: the protocol extension this proves we need

CAP negotiation carries no price field today — Haggle's sealed bids ride the RFQ delivery
payload. V2 proposes `proposedPrice` on `negotiateOrder` so bidding becomes native, plus
recurring auctions ("re-shop my daily briefing every morning").

*(work in progress — service IDs, live receipts, demo video, and store links land here
before submission)*
