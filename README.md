<p align="center">
  <img src="branding/haggle-avatar-1024.png" width="110" alt="Haggle logo"/>
</p>

<h1 align="center">Haggle</h1>

<p align="center"><b>The auction broker of the agent economy — because agents shouldn't pay full price.</b></p>

<p align="center">
  <a href="https://agent.croo.network/agents/a28b21af-6664-4e21-b0d9-bd12d5a1eacb"><img src="https://img.shields.io/badge/CROO%20Agent%20Store-LIVE-84E64C?labelColor=101314" alt="Live on the CROO Agent Store"/></a>
  <img src="https://img.shields.io/badge/settles%20on-Base%20mainnet-0052FF?labelColor=101314" alt="Settles on Base mainnet"/>
  <img src="https://img.shields.io/badge/license-MIT-f5f5f5?labelColor=101314" alt="MIT license"/>
</p>

---

The CROO Agent Store has 100+ AI agents, each with a fixed price tag — and every buyer
pays list price to the first agent they find. No comparison, no competition, no receipts.

**Haggle is a procurement agent with a wallet.** Give it a task and a budget; it runs a
sealed-bid auction across every capable agent on the store, awards the job to the best
bid (price × reputation × SLA), pays with escrowed USDC on Base, verifies the delivery,
and returns the result with an on-chain **auction receipt** — every bid, every
transaction, and exactly what you saved.

## How one job flows

```
buyer (human or agent)
  └─ run_auction ($0.30) ──► HAGGLE
       1. filter registry candidates (category, budget)
       2. sealed bids: RFQ micro-orders to quote-capable agents;
          list price stands as the bid for everyone else
       3. score every bid: price × reputation × SLA
       4. award → escrow → verify delivery
          · winner offline?  escrow refunds, runner-up gets the job
          · delivery is junk? spend written off on the receipt, re-route
       5. optional "verify": true — an INDEPENDENT team's agent grades
          the winner's work before you see it
       6. deliver: result + auction receipt (bids, tx links, savings)
```

## Honest by design

- **Liveness-tagged bids** — every receipt marks each bidder `won / lost / offline`
- **Truthful savings** — computed only against *reachable* bidders; a sole live bidder
  reports `savings: 0` with the reason, never inflated numbers
- **Quality re-routing** — escrow proves a delivery *happened*, not that it's good;
  error-object deliveries are detected, the spend is written off on the receipt, and
  the runner-up gets the job (proven in production)
- **Refund-safe** — SLA timeouts and rejections auto-refund from escrow by contract;
  a failed job never costs the buyer anything

## A real receipt (Base mainnet, 2026-07-12)

```json
{
  "task": "Fact-check this claim: the USDC token on Base at 0x8335…2913 has a total supply above 3 billion tokens",
  "bids": [
    { "team": "Receipt Agent", "service": "onchain-fact-check", "bidUsdc": 0.1, "status": "won" }
  ],
  "winner": { "team": "Receipt Agent", "bidUsdc": 0.1 },
  "awardOrderId": "21d3e433-a57b-450a-a1a1-8d86f1da8c54",
  "totalSpentUsdc": 0.1,
  "notes": ["winner was the only reachable bidder — savings reported as 0"]
}
```

The winner — another team's agent, hired and paid autonomously — returned a full
on-chain safety report with named sources and a cryptographic attestation on Base.

## Results (hackathon window)

- **~18 real CAP orders** on Base mainnet · 7 completed `run_auction` jobs
- Downstream hires to **2 external teams' agents** (full LOCK → DELIVER → CLEAR timelines)
- Escrow-refund path and quality re-route both **proven with real orders**, not mocks
- Provider runs **24/7** (Dockerized on Railway, self-healing websocket watchdog)
- Disclosed test buyers (Navigator + haggle-test); every order verifiable on basescan

## Quick start

```bash
npm install
cp .env.example .env    # add your API keys from agent.croo.network
npm run provider        # haggle goes online and sells run_auction
npm run job -- "fact-check this claim …" verification 0.3   # run one auction directly
npm run buyer           # place a real inbound order from the demo buyer agent
```

Runs anywhere Node 18+ runs; see [DEPLOY.md](DEPLOY.md) for the 24/7 cloud setup
(Railway/Render/Fly via the included [Dockerfile](Dockerfile)).

## Why this is impossible on a normal API marketplace

No agent wallets, no escrow, no automatic refunds, no per-call hiring between
strangers. On the CROO Agent Protocol, every quote is a paid on-chain micro-order,
awards are escrowed in CAPVault, and failed deliveries refund by contract — price
discovery becomes a protocol primitive.

**SDK surface used:** `AgentClient` · `connectWebSocket` · `negotiateOrder` ·
`acceptNegotiation` · `rejectNegotiation` · `payOrder` · `deliverOrder` ·
`rejectOrder` · `getOrder` · `getNegotiation` · `getDelivery` · `listOrders` ·
`listNegotiations` + all order/negotiation WebSocket events

## Roadmap

- **Live price bidding** — CAP negotiation has no price field today (Haggle's sealed
  bids ride the RFQ payload); we propose a `proposedPrice` extension so agents can bid
  *below* their listed price to win work
- **Recurring auctions** — "re-shop my daily briefing every morning"
- **Auto-discovery** — the registry becomes a cache the day CROO ships a service
  discovery API

## Links

- **Live agent:** https://agent.croo.network/agents/a28b21af-6664-4e21-b0d9-bd12d5a1eacb
- **Demo video (≤5 min):** _link in the DoraHacks BUIDL_
- **Design doc:** [ARCHITECTURE.md](ARCHITECTURE.md)

Built for the **CROO Agent Hackathon 2026** · USDC on Base mainnet · gas sponsored by CROO · MIT
