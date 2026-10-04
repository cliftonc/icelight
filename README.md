# icelight

First party product analytics on Cloudflare. Stream Analytics.js events into Apache Iceberg tables on R2 and query them with SQL or dashboards — a very cost effective replacement for Google Analytics, Mixpanel etc.

**Live Demo**: https://try.icelight.dev

> **This is an example project, not a hosted service or a library you install.** The intent is that you clone it, deploy your own copy with `pnpm launch`, and then make it yours: change the event schema, cubes, dashboards and UI to build your own in-house product analytics on your Cloudflare account. The demo above runs on generated data and is reset daily.

## TL;DR

You need a Cloudflare account on the Workers Paid plan, Node 18+, pnpm, and a [Cloudflare API token](#3-create-an-api-token).

```bash
git clone https://github.com/cliftonc/icelight.git && cd icelight
pnpm install
npx wrangler login
pnpm launch      # asks for your API token, creates everything, deploys, seeds demo data
```

Then open the Query API URL it prints. To remove everything later, run `pnpm teardown`.

## Get it running

### What you need

- A **Cloudflare account** on the **Workers Paid** plan (required for Basin Pipelines)
- **Node.js 18+** and **pnpm 8+** (`npm install -g pnpm`)
- A **Cloudflare API token** (step 3 below)

### 1. Clone and install

```bash
git clone https://github.com/cliftonc/icelight.git
cd icelight
pnpm install
```

### 2. Log in to Cloudflare

```bash
npx wrangler login
```

### 3. Create an API token

At [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) → **Create Token** → **Create Custom Token**, add these **Account** permissions:

| Permission | Access |
|------------|--------|
| Basin Catalog | Edit |
| Basin SQL | Read |
| Workers R2 Storage | Edit |
| Workers Scripts | Read |

Set **Account Resources** to include your account, create the token and copy it. `pnpm launch` will ask for it. ([Why each permission is needed](docs/configuration.md#cloudflare-api-token-permissions).)

### 4. Launch

```bash
pnpm launch
```

This creates everything in your Cloudflare account — an R2 bucket with Basin Catalog, a Basin Pipelines stream/sink/pipeline, the ingest and query workers — and offers to seed 30 days of demo events. It's safe to re-run if something fails.

When it finishes, open the Query API URL it prints:

```
https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev
```

Demo data appears after the first sink flush (about 1–2 minutes).

Launch also generates an ingest write key, `ICELIGHT_INGEST_TOKEN` in `.env`. The ingest worker requires it on every request (see [Cost & abuse protection](#cost--abuse-protection)).

### 5. Send your own events

Point any Analytics.js (RudderStack / Segment) client at your ingest worker, using `ICELIGHT_INGEST_TOKEN` from `.env` as the write key:

```javascript
import { Analytics } from '@rudderstack/analytics-js';

const analytics = new Analytics({
  writeKey: 'YOUR_ICELIGHT_INGEST_TOKEN',
  dataPlaneUrl: 'https://icelight-event-ingest.YOUR-SUBDOMAIN.workers.dev'
});

analytics.track('Purchase Completed', { orderId: '12345', revenue: 99.99 });
```

Or send events over HTTP:

```bash
curl -X POST https://icelight-event-ingest.YOUR-SUBDOMAIN.workers.dev/v1/track \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $ICELIGHT_INGEST_TOKEN" \
  -d '{"userId":"user-123","event":"Button Clicked","properties":{"button":"signup"}}'
```

### Start over with fresh demo data

```bash
pnpm reseed            # 30 days; or e.g. pnpm reseed 60
```

Deletes every event in `analytics.events` and sends fresh demo events. Keeps the bucket, catalog, stream and workers (no redeploy); the sink and pipeline are recreated, because a Basin Catalog sink can't write to an existing table. Asks before deleting (`--confirm` skips the prompt; `--reset-dashboard` also resets the default dashboard).

### Remove everything

```bash
pnpm teardown
```

Deletes everything `pnpm launch` created, **including all event data**. Use `pnpm teardown --keep-bucket` to keep the data.

If you tried it and it wasn't useful, I'd love to know why via an [issue](https://github.com/cliftonc/icelight/issues/new?template=BLANK_ISSUE).

---

## What it is

icelight collects analytics events and stores them in queryable Iceberg tables using [Cloudflare Basin](https://developers.cloudflare.com/basin/):

- **Event ingestion**: RudderStack/Segment-compatible HTTP endpoints, streamed through Basin Pipelines
- **Storage**: Apache Iceberg tables on R2, managed by Basin Catalog
- **Querying**: Basin SQL, plus a semantic layer (drizzle-cube) powering the dashboards and Analysis Builder

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Your App /    │────▶│  Event Ingest   │────▶│ Basin Pipelines │
│  Analytics SDK  │     │    Worker       │     │ (stream → sink) │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌─────────────────┐     ┌────────▼────────┐
                        │   Query API     │◀────│  R2 + Iceberg   │
                        │ (Basin SQL)     │     │  Basin Catalog  │
                        └─────────────────┘     └─────────────────┘
```

The Query API worker also serves the web UI:

- **Dashboards** and an **Analysis Builder** (visual queries and charts)
- **Basin SQL** editor for direct SQL (aggregations, joins, window functions)
- **Event Simulator** for sending test events with the RudderStack SDK

## Querying Data

```bash
# Basin SQL query
curl -X POST https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT type, COUNT(*) AS c FROM analytics.events GROUP BY type"}'

# Semantic API query
curl -X POST https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev/cubejs-api/v1/load \
  -H "Content-Type: application/json" \
  -d '{"query": {"dimensions": ["Events.type"], "measures": ["Events.count"], "limit": 100}}'

# CSV output
curl -X POST https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM analytics.events LIMIT 10", "format": "csv"}'

# List tables / describe schema
curl https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev/tables/analytics
curl https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev/tables/analytics/events
```

External engines (PyIceberg, DuckDB, Spark) can read the same tables through Basin Catalog's Iceberg REST endpoint (`https://catalog.cloudflarestorage.com/<account-id>/<bucket>`). See [Querying Data](docs/querying.md#external-query-engines).

### Ask Claude (MCP)

The query API serves the semantic layer as an MCP server at `/mcp` (tools: `discover`, `validate`, `load`, `chart`), so Claude can answer questions about your events in plain English.

- **Claude (web, desktop, mobile)**: Settings → Connectors → **Add custom connector**, with the URL `https://<your-query-api>/mcp` (the demo is `https://try.icelight.dev/mcp`).
- **Claude Code**:

  ```bash
  claude mcp add --transport http icelight https://<your-query-api>/mcp
  # if you set API_TOKEN: add --header "Authorization: Bearer <token>"
  ```

Then ask things like "How many events did we have this week, and which day had the most revenue?"

## API Endpoints

### Ingest worker

Standard Analytics.js endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/batch` | POST | Batch events (primary) |
| `/v1/track` | POST | Single track event |
| `/v1/identify` | POST | Single identify event |
| `/v1/page` | POST | Single page event |
| `/v1/screen` | POST | Single screen event |
| `/v1/group` | POST | Single group event |
| `/v1/alias` | POST | Single alias event |
| `/health` | GET | Health check |

### Query API worker

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/query` | POST | Execute Basin SQL query |
| `/tables/:namespace` | GET | List tables in namespace |
| `/tables/:namespace/:table` | GET | Describe table schema |
| `/cubejs-api/v1/meta` | GET | Cube.js-compatible semantic layer metadata |
| `/cubejs-api/v1/load` | POST | Execute Cube.js-compatible semantic query |
| `/mcp` | POST | MCP server for Claude and other MCP clients |
| `/api/dashboards` | * | Dashboard storage (D1) |
| `/api/config` | GET | Public: `{ authRequired, publicDemo }`, used by the UI |
| `/health` | GET | Health check |

## Development

```bash
pnpm dev:ingest     # Run ingest worker locally
pnpm dev:query      # Run query worker locally
pnpm build          # Build all packages
pnpm typecheck      # Type check
```

Local workers still use your remote Cloudflare resources (Basin Pipelines and Basin SQL have no local emulation), so run `pnpm launch` first.

Load demo data into any ingest worker (this adds to existing data; `pnpm reseed` replaces it):

```bash
INGEST_API_URL=https://icelight-event-ingest.YOUR-SUBDOMAIN.workers.dev pnpm generate-events 30
```

## Troubleshooting

### Launch fails

Launch shows wrangler's error message and log file path. Fix the cause and re-run `pnpm launch`; it skips resources that already exist.

- **"writing to existing Catalog tables is not yet supported"**: a Basin Catalog table is left over from a previous deployment. Run `pnpm teardown`, then launch again.
- **"Not logged in"**: run `npx wrangler login`.

### Query API returns empty data

1. Wait 1–2 minutes — the sink flushes to R2 every 60 seconds
2. Check `WAREHOUSE_NAME` in `workers/query-api/wrangler.local.jsonc` is `<account-id>_<bucket>` (see `npx wrangler basin catalog get <bucket>`)
3. Check the `CF_ACCOUNT_ID` and `CF_API_TOKEN` worker secrets are set

### Events not arriving

1. Requests rejected with 401 need the write key (`ICELIGHT_INGEST_TOKEN`); a 500 "Authentication is enabled but no token is configured" means `AUTH_TOKEN` isn't set yet (see [Upgrading](#upgrading-an-existing-deployment)); 429 means the per-IP rate limit was hit
2. Check `workers/event-ingest/wrangler.local.jsonc` exists (if not, run `pnpm launch`) and has `"pipelines": [{ "binding": "PIPELINE", "stream": "<STREAM_ID>" }]`
3. Run `npx wrangler basin pipelines streams list` to confirm the stream ID
4. Redeploy after config changes: `pnpm deploy:ingest`

Events that don't match the stream schema are accepted but dropped during processing.

### Teardown

Teardown also drops Basin Catalog tables, aborts unfinished uploads left by the pipeline, and removes the DuckDB worker/container from deployments created before the move to Basin SQL. If it stops part way, re-run it.

## Pricing & Limits

Basin is billed per use ([pricing](https://developers.cloudflare.com/basin/platform/pricing/)):

- **Ingest (stream)**: free
- **Pipeline SQL transform**: 50 GB/month included, then $0.04/GB
- **Sink delivery (Parquet/Iceberg)**: 50 GB/month included, then $0.06/GB
- **Basin SQL**: 10 GB/month scanned included, then $2.50/TB of compressed data scanned (10 MB minimum per query)
- R2 storage is billed separately

Limits worth knowing:

- Streams, sinks and pipeline SQL **cannot be changed after creation** — delete and recreate (`pnpm teardown && pnpm launch`)
- 20 streams, 20 sinks and 20 pipelines per account; 5 MB per ingest request; 1 GB/s per stream
- Basin SQL is read-only and has no `OFFSET`, `UNNEST`, `PIVOT` or `LATERAL` (the semantic layer emulates `OFFSET`)

## Cost & abuse protection

Every uncached query is a billed Basin SQL query (10 MB minimum), and every accepted event is billed by Basin Pipelines and makes later scans bigger. Basin has no spend caps or budget alerts, so the limits sit in front of it. Rough costs if someone hammers a public deployment: 1M uncached queries ≈ $25; junk ingest ≈ $0.10/GB, plus larger scans for every query after it.

What's on by default:

- **Ingest auth**: `AUTH_ENABLED` is `"true"`. Launch generates `ICELIGHT_INGEST_TOKEN` in `.env` and sets it as the ingest worker's `AUTH_TOKEN` and the query API's `INGEST_AUTH_TOKEN` (used by the daily cron). Seeding sends it automatically. Browser write keys are visible to anyone, so the rate limit is the real bound.
- **Per-IP rate limits** (Workers rate limiting bindings, set in `wrangler.jsonc`): ingest 300 requests/min with a 2 MB body cap; query API 300 requests/min on `/query`, `/tables`, `/cubejs-api`, `/mcp` and `/api/dashboards`. Over the limit returns 429 with `Retry-After`.
- **Cache bypass for authenticated callers only**: `X-Cache-Control: no-cache` is ignored unless `API_TOKEN` is set, so anonymous callers always hit the KV cache.

Optional:

- **`API_TOKEN`** (query API secret): requires a Bearer token for queries, MCP and dashboards. Use it for private deployments; the UI then shows a token field in the navbar.
- **`ICELIGHT_PUBLIC_DEMO="true"`** in `.env` (then `pnpm launch`): lets anonymous visitors send events through the query API's `/v1/*` proxy, which adds the write key for them. Limited to 20 requests/min per IP and 64 KB per request. This is how the [live demo](https://try.icelight.dev)'s Event Simulator works. Without it, the simulator needs the write key.
- **Further hardening** (not automated): set `"workers_dev": false` so all traffic goes through your custom domain (`ICELIGHT_QUERY_DOMAIN`), then add a WAF rate-limiting rule on that zone. workers.dev URLs bypass zone WAF rules.

### Upgrading an existing deployment

Run `pnpm launch` to generate the write key and set the secrets. If you only run `pnpm deploy:ingest`, the ingest worker returns 500 "Authentication is enabled but no token is configured" until you set it by hand:

```bash
TOKEN=$(openssl rand -base64 32)
echo "ICELIGHT_INGEST_TOKEN=\"$TOKEN\"" >> .env
echo "$TOKEN" | npx wrangler secret put AUTH_TOKEN --config workers/event-ingest/wrangler.local.jsonc
echo "$TOKEN" | npx wrangler secret put INGEST_AUTH_TOKEN --config workers/query-api/wrangler.local.jsonc
```

## Documentation

- [Getting Started](docs/getting-started.md)
- [Configuration](docs/configuration.md)
- [Querying Data](docs/querying.md) — SQL, semantic API, JSON field extraction
- [SDK Integration](docs/sdk-integration.md)

Cloudflare docs: [Basin](https://developers.cloudflare.com/basin/) · [Basin Pipelines](https://developers.cloudflare.com/basin-pipelines/) · [Basin Catalog](https://developers.cloudflare.com/basin-catalog/) · [Basin SQL](https://developers.cloudflare.com/basin-sql/)

## License

MIT
