# Haggle — Best-Execution Auction Broker for the CROO Agent Economy

> One sentence: give Haggle a task and a budget; it runs a sealed-bid auction across every
> capable agent on the CROO Agent Store, awards the job to the best bid (price × reputation
> × SLA), escrows, verifies delivery, and returns the result with a signed auction receipt
> proving what you saved — every step a real on-chain CAP order on Base.

Tracks: **Open – Any A2A Agents** + **Developer Tooling Agents** (bidder sidecar).

## Why this design fits the protocol (see docs/croo-reference/README.md)

CAP has no per-order price negotiation (`negotiateOrder` carries no price field) and no
service-edit API. So Haggle runs a **sealed-bid, best-execution auction**:

- Agents that adopt our open `haggle-bidder` sidecar respond to a paid RFQ with a structured
  bid (their effective offer, confidence, ETA) in the delivery payload.
- Agents that don't: their **list price stands as their sealed bid**. Honest fallback —
  the auction always has a full field of bidders.
- Roadmap slide: propose a `proposedPrice` extension to CAP negotiation — judges are the
  protocol team; showing we hit the protocol's edge and built the market layer anyway is a
  feature, not a bug.

## Components

```
                        ┌────────────────────────────────────────┐
 inbound buyers ───────►│ HAGGLE AGENT (provider + requester)    │
 (humans via store UI,  │                                        │
  other teams' agents)  │ 1. run_auction service (schema in/out) │
                        │ 2. Auction engine                      │
                        │    • Registry of candidate services    │
                        │    • RFQ round (paid micro-orders) ────┼──► candidate agents
                        │    • Scoring: price×reputation×SLA     │    (many teams)
                        │    • Award: negotiate→pay→verify ──────┼──► winning agent
                        │    • Re-route to runner-up on failure  │
                        │    • Budget guard + refund paths       │
                        │ 3. Receipt builder (bids, txs, savings)│
                        └───────────────┬────────────────────────┘
                                        │ events (jobs, bids, awards)
                        ┌───────────────▼───────────────┐
                        │ Dashboard (Next.js, Vercel):  │
                        │ live "auction theater" +      │
                        │ basescan links + savings      │
                        └───────────────────────────────┘
        + haggle-bidder: open-source 30-line sidecar any team adds to receive RFQs
```

### 1. Haggle agent (Node.js/TypeScript, `@croo-network/sdk`)

Registered on the Dashboard with service:

- **`run_auction`** — price **0.30 USDC**, SLA 30m, requirements schema:
  `{task: string, category: string, budget_usdc: number, quality_weight?: number}`,
  deliverable schema: `{result: object|string, receipt: AuctionReceipt}`.

Provider loop: `NegotiationCreated` → `acceptNegotiation` → `OrderPaid` → run auction →
`deliverOrder`. If no candidate fits the budget or all fail: `rejectOrder` → **escrow
auto-refunds the buyer** (payment-state correctness = the 30% criterion's explicit ask).

### 2. Registry (`registry/registry.json`)

Curated catalog: `{serviceId, agentId, teamName, category, listPriceUsdc, slaMinutes,
statsSource, quoteServiceId?}`. Sources: Agent Store UI + service IDs published in other
teams' BUIDL READMEs (RateCard, Floatline, DepegGuard etc. publish theirs). Target:
**12–15 services across 8+ distinct teams, 4–5 categories** (research, defi-intel,
security-scan, content, verification). More teams touched = better A2A diversity score.

### 3. Auction engine (`src/auction/`)

Per job:
1. **Candidate filter** — category match + list price ≤ budget.
2. **RFQ round** — for candidates with a `quoteServiceId`: place a **real paid order**
   (~$0.01–0.05) with the job spec as `requirements`; parse structured bid from delivery.
   Others: sealed bid = list price. Cap RFQ spend at 15% of budget. Every RFQ = a real
   on-chain order to another team = order-graph fuel + goodwill.
3. **Scoring** — `score = wp·(1 − price/maxBid) + wr·reputation + ws·slaFit`, weights from
   `quality_weight`. Reputation from store-page stats (completion rate, order count),
   cached in registry, refreshed manually.
4. **Award** — `negotiateOrder` winner → `OrderCreated` → `payOrder` → await
   `OrderCompleted` (timeout = provider SLA) → `getDelivery` → validate (nonempty, schema
   parse, category keyword check).
5. **Failure re-route** — SLA expiry auto-refunds escrow → award runner-up (max 2 retries).
   Crash-safe: persist job state (SQLite/JSON) keyed by orderId; on restart, reconcile via
   `listOrders`/`getOrder` before spending (never double-pay).
6. **Receipt** — `{jobId, candidates[], bids[], scores[], winner, orders: [{orderId,
   txHash, role}], totalSpent, savedVsMaxBid, savedVsMeanBid, timestamps}` — the deliverable
   users screenshot and judges verify on basescan.

### 4. `haggle-bidder` sidecar (separate package, MIT)

~30-line provider template: registers a "RFQ Quote — $0.01" service; on `OrderPaid`,
answers with `{bid_usdc, eta_minutes, confidence, notes}`. Pitch to other teams (Discord):
"add one file, earn $0.01 every time Haggle considers you, win jobs you'd never see."
Every adoption = a cross-team A2A relationship visible in the judges' order data.

### 5. Dashboard (`web/`, Next.js on Vercel)

Read-only auction theater: job feed → bids arriving → scores → award → delivery → receipt,
every order linking to basescan. Powered by the engine's persisted state (poll a tiny
`/api/jobs` endpoint). No auth, no writes. It's demo decoration — engine comes first.

## Wallet & anti-sybil plan

- Haggle agent (provider+requester roles) + a second "demo buyer" agent, funded ~$10 USDC
  total on Base (AA wallet address, NOT controller address).
- ≥5 unique buyer wallets: mine, partner's, 2–3 friends via store UI, any team accepting
  the free-auction offer.
- ≥3 unique counterparties: RFQ + award rounds touch 8+ teams by design.
- 10+ real orders: one job ≈ 3–6 RFQs + 1 award + 1 inbound = ~8; five demo jobs ≈ 40.
- No concentrated self-trades: inbound demo orders spread across wallets; downstream spend
  is inherently diverse.

## Build plan (~20 focused hours)

**Phase 0 — Plumbing first (1.5–2h)** *Kill the unknowns before writing code.*
Sign up, register both agents, save API keys, deposit USDC, install SDK, run the stock
`provider.ts` + `requester.ts` examples end-to-end until one real order settles on basescan.
If anything blocks here (KYC, deposit delay), we find out NOW, not at hour 18.

**Phase 1 — Haggle provider skeleton (2–3h)**
`run_auction` listed on store; WS loop; accept → paid → deliver a stub receipt. First real
inbound order completes. ✅ Submission requirement #1 & #2 secured on day one.

**Phase 2 — Auction engine (4–6h)** — registry (12–15 curated services), RFQ round,
scoring, award, validation, re-route, budget guard, receipt builder, crash-safe state.

**Phase 3 — Sidecar + outreach (2h, overlaps)** — publish `haggle-bidder`; Discord post +
DM every team in the registry: free auction featuring their agent + RFQ revenue.

**Phase 4 — Dashboard (3–4h)** — auction theater + basescan links + savings counter; Vercel.

**Phase 5 — Run the economy (2–3h, overlaps)** — 5–10 real jobs across categories; friends
place inbound orders via store UI; screenshot everything.

**Phase 6 — Ship (3–4h)** — README (setup, every SDK method used, service IDs, integration
notes), MIT license, ≤5-min video (30s problem → 2m live auction with money moving → 1m
receipt/basescan → 45s architecture → 30s protocol-extension roadmap), file the BUIDL
**early** on DoraHacks and edit later; tracks: Open A2A + Developer Tooling.

**Deadline discipline:** organizer deadline **Jul 9 23:59 UTC+8**; portal hard stop Jul 12
09:00 UTC. File by Jul 9. Re-scrape the submission list before filing to confirm no
late-arriving auction clone (script in scratchpad; endpoint in docs/croo-reference).

## Honest risk register

| Risk | Mitigation |
|---|---|
| Onboarding friction (keys, deposit) | Phase 0 first; nothing else starts until one order settles |
| Other agents flaky during RFQ/award | List-price fallback bids; SLA auto-refund + runner-up re-route |
| No protocol price negotiation | Sealed-bid design + propose CAP extension in roadmap (judges = protocol team) |
| Judges bucket us with orchestrators | Every asset leads with the auction: bids on screen, savings number, "the only market in the hackathon" |
| Time | Dashboard and sidecar are cuttable; engine + receipts + video are not |
