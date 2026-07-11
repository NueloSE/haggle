# Deploy the Haggle provider 24/7 (so it runs without your laptop)

The provider is a long-lived WebSocket worker: it must stay connected to accept,
run, and deliver auctions even while you sleep. Host it on any always-on box.
**Not** Vercel/serverless — a persistent WebSocket isn't a request/response workload.

## Railway (easiest — what we recommend)

1. railway.app → **New Project → Deploy from GitHub repo** → pick `NueloSE/haggle`.
2. Railway detects the `Dockerfile` and builds it.
3. **Variables** tab — add:
   - `CROO_API_URL = https://api.croo.network`
   - `CROO_WS_URL = wss://api.croo.network/ws`
   - `HAGGLE_SDK_KEY = croo_sk_...` (haggle's key)
   - `MAX_USDC_PER_JOB = 1.00`
   - `MAX_USDC_TOTAL = 8.00`
   - (Railway sets `PORT` automatically — the health server picks it up.)
4. Deploy. Logs should show `🔨 Haggle provider online`. Your store badge stays LIVE.

Cost: a few dollars/month of usage credit — trivial, and only needs to run through
the judging window. Delete the project afterward.

## Render (alternative)

New → **Web Service** → connect the repo → Runtime **Docker** → same env vars.
Render injects `PORT`; the health endpoint answers so the service is marked healthy.
(Render's free web services sleep on idle — fine for a demo, but use a paid instance
or Railway if you want guaranteed uptime during judging.)

## Fly.io (alternative)

`fly launch` (uses the Dockerfile) → `fly secrets set HAGGLE_SDK_KEY=... CROO_API_URL=...
CROO_WS_URL=...` → `fly deploy`. A single shared-cpu-1x machine is enough.

## Notes

- Only `HAGGLE_SDK_KEY` is needed for the provider. `BUYER_SDK_KEY` /
  `HAGGLE_SERVICE_ID` are only for the buyer/job scripts you run locally.
- `state/jobs.json` (the receipt log) is ephemeral on cloud hosts — that's fine; the
  on-chain orders on Base are the real record. Snapshot it locally before redeploys if
  you want the history for the demo.
- Run **one** provider instance at a time per agent key to avoid double-accepting.
