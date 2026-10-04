# icelight

First party product analytics on Cloudflare. Stream Analytics.js events into Apache Iceberg tables on R2 and query them with SQL or dashboards — a very cost effective replacement for Google Analytics, Mixpanel etc.

**Live Demo**: https://try.icelight.dev

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

### 5. Send your own events

Point any Analytics.js (RudderStack / Segment) client at your ingest worker:

```javascript
import { Analytics } from '@rudderstack/analytics-js';

const analytics = new Analytics({
  writeKey: 'any-value',
  dataPlaneUrl: 'https://icelight-event-ingest.YOUR-SUBDOMAIN.workers.dev'
});

analytics.track('Purchase Completed', { orderId: '12345', revenue: 99.99 });
```

Or send events over HTTP:

```bash
curl -X POST https://icelight-event-ingest.YOUR-SUBDOMAIN.workers.dev/v1/track \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-123","event":"Button Clicked","properties":{"button":"signup"}}'
```

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
| `/health` | GET | Health check |

## Development

```bash
pnpm dev:ingest     # Run ingest worker locally
pnpm dev:query      # Run query worker locally
pnpm build          # Build all packages
pnpm typecheck      # Type check
```

Local workers still use your remote Cloudflare resources (Basin Pipelines and Basin SQL have no local emulation), so run `pnpm launch` first.

Load demo data into any ingest worker:

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

1. Check `workers/event-ingest/wrangler.local.jsonc` exists (if not, run `pnpm launch`) and has `"pipelines": [{ "binding": "PIPELINE", "stream": "<STREAM_ID>" }]`
2. Run `npx wrangler basin pipelines streams list` to confirm the stream ID
3. Redeploy after config changes: `pnpm deploy:ingest`

Events that don't match the stream schema are accepted but dropped during processing.

### Teardown

Teardown also drops Basin Catalog tables, aborts unfinished uploads left by the pipeline, and removes the DuckDB worker/container from deployments created before the move to Basin SQL. If it stops part way, re-run it.

## Pricing & Limits

Basin is billed per use ([pricing](https://developers.cloudflare.com/basin/platform/pricing/)):

- **Ingest**: free
- **Sink delivery (Parquet/Iceberg)**: 50 GB/month included, then $0.06/GB
- **Basin SQL**: 10 GB/month scanned included, then $2.50/TB of compressed data scanned (10 MB minimum per query)
- R2 storage is billed separately

Limits worth knowing:

- Streams, sinks and pipeline SQL **cannot be changed after creation** — delete and recreate (`pnpm teardown && pnpm launch`)
- 20 streams, 20 sinks and 20 pipelines per account; 5 MB per ingest request; 1 GB/s per stream
- Basin SQL is read-only and has no `OFFSET`, `UNNEST`, `PIVOT` or `LATERAL` (the semantic layer emulates `OFFSET`)

## Documentation

- [Getting Started](docs/getting-started.md)
- [Configuration](docs/configuration.md)
- [Querying Data](docs/querying.md) — SQL, semantic API, JSON field extraction
- [SDK Integration](docs/sdk-integration.md)

Cloudflare docs: [Basin](https://developers.cloudflare.com/basin/) · [Basin Pipelines](https://developers.cloudflare.com/basin-pipelines/) · [Basin Catalog](https://developers.cloudflare.com/basin-catalog/) · [Basin SQL](https://developers.cloudflare.com/basin-sql/)

## License

MIT
