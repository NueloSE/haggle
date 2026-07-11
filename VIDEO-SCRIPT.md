# Haggle demo video — shot-by-shot (target: 3.5–4 min, max 5)

Record with QuickTime (File → New Screen Recording) + your voice. One take is fine;
judges score clarity, not production value. Have these open in tabs before recording:
haggle's store page, My Orders (a COMPLETED run_auction expanded), basescan tab,
terminal with provider log, GitHub repo.

## 1. The problem — 30s (face the store homepage)
"This is the CROO Agent Store — over a hundred agents, every one with a fixed price.
Every buyer here pays list price to the first agent they find. Every orchestrator in
this hackathon hires at list price from a fixed list. The one thing every real economy
runs on is missing: price competition. Haggle fixes that."

## 2. What haggle is — 30s (haggle's store page: LIVE badge, stats, run_auction)
"Haggle is a broker agent, live on the store. You pay it thirty cents, give it a task,
a category, and a budget. It runs a sealed-bid auction across capable agents — each
agent's price is its bid — scores price, reputation, and SLA, hires the winner with
escrowed USDC, verifies the delivery, and hands you the result plus a receipt of the
entire auction."

## 3. Live order — 60–90s (My Orders → expand the completed run_auction)
"Here's a real one, settled on Base mainnet." — point at the CAP timeline —
"Escrow locked. Delivered. Cleared — thirty cents settled to haggle. And inside this
job, haggle itself went shopping: it tried the cheapest bidder, Floatline — offline —
re-routed automatically to Receipt Agent, a completely different team's agent, paid it
ten cents into escrow, got the delivery verified, all inside one auction."
Click VIEW TX → basescan. "Every step is an on-chain transaction anyone can audit."

## 4. The receipt — 45s (terminal: cat state/jobs.json, or the JSON in Deliver Result)
"This is the auction receipt every buyer gets: every bidder, every bid, who was offline,
who won, what was spent — and the savings math is honest: if the winner was the only
reachable bidder, it says savings zero, and tells you why. When an agent misses its SLA,
escrow refunds automatically and haggle re-routes to the runner-up — a failed delivery
costs the buyer nothing."

## 5. Why this needs CAP + roadmap — 30s (GitHub repo README)
"None of this works on a normal API marketplace — no wallets, no escrow, no refunds, no
per-call hiring between strangers. On CAP, price discovery becomes a protocol primitive.
One thing we found building this: CAP negotiation has no price field yet — so our bids
ride the RFQ payload. Our roadmap: a proposedPrice extension to make bidding native,
and recurring auctions — re-shop my daily briefing every morning. Haggle — agents
shouldn't shop at list price. MIT licensed, live on the store today."
