# icelight

First party product analytics platform.  Stream analytics.js events to Apache Iceberg tables on Cloudflare R2 - a very cost effective replacement for Google Analytics, MixPanel etc.

## Overview

icelight provides a complete solution for collecting analytics events and storing them in queryable Iceberg tables using [Cloudflare Basin](https://developers.cloudflare.com/basin/):

- **Event Ingestion**: RudderStack/Segment-compatible HTTP endpoints, streamed through Basin Pipelines
- **Data Storage**: Apache Iceberg tables on R2, managed by Basin Catalog
- **Query API**: SQL queries via Basin SQL, plus a semantic layer (drizzle-cube) on top

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

**Live Demo**: https://try.icelight.dev

## Prerequisites

- **Cloudflare Account**: [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) on the Workers Paid plan (required for Basin Pipelines)
- **Node.js 18+**: [nodejs.org](https://nodejs.org/)
- **pnpm 8+**: `npm install -g pnpm`

## Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/cliftonc/icelight.git
cd icelight
pnpm install
```

### 2. Login to Cloudflare

```bash
npx wrangler login
```

### 3. Launch Everything

```bash
pnpm launch
```

Enter a project name when prompted. The script will:
- Create an R2 bucket with Basin Catalog enabled
- Create and configure Basin Pipelines (stream, sink, pipeline)
- Deploy the Event Ingest worker
- Deploy the Query API worker (this is the same code as https://try.icelight.dev)
- Optionally seed 30 days of demo events so the dashboards aren't empty

Once complete, you'll see your worker URLs.  You can run this again if you see any issues, as it inspects your cloudflare environment and will attempt to resolve any changes.

### 4. Open the Web UI

Visit your Query API URL in a browser:

```
https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev
```

The Web UI includes:
- **Analysis Builder**: Visual query builder with charts
- **Basin SQL**: Direct SQL queries against your Iceberg tables (aggregations, joins, window functions)
- **Event Simulator**: Send test events using the RudderStack SDK

### 5. Finished?

If for any reason you thought this was interesting, but not that useful (I'd love to know why via an [issue](https://github.com/cliftonc/icelight/issues/new?template=BLANK_ISSUE)), you can clean up:

```
pnpm teardown
```

This command will remove everything created in your Cloudflare account, including any data loaded into the bucket.

## Client SDK Integration

### RudderStack / Segment

Icelight simply uses the open source Analytics.js library (from Segment and Rudderstack).

```javascript
import { Analytics } from '@rudderstack/analytics-js';

const analytics = new Analytics({
  writeKey: 'any-value',
  dataPlaneUrl: 'https://icelight-event-ingest.YOUR-SUBDOMAIN.workers.dev'
});

analytics.track('Purchase Completed', { orderId: '12345', revenue: 99.99 });
analytics.identify('user-123', { email: 'user@example.com', plan: 'premium' });
```

### Direct HTTP

You can also send messages directly, e.g. from your backend:

```bash
# Track event
curl -X POST https://YOUR-WORKER.workers.dev/v1/track \
  -H "Content-Type: application/json" \
  -d '{"userId":"user-123","event":"Button Clicked","properties":{"button":"signup"}}'

# Batch events
curl -X POST https://YOUR-WORKER.workers.dev/v1/batch \
  -H "Content-Type: application/json" \
  -d '{"batch":[
    {"type":"track","userId":"u1","event":"Page View"},
    {"type":"identify","userId":"u1","traits":{"name":"John"}}
  ]}'
```

## Querying Data

### Via Web UI

The Query API includes a web-based explorer at your worker URL with a Basin SQL editor, dashboards, and a visual Analysis Builder.

### Via API

```bash
# Basin SQL query
curl -X POST https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM analytics.events LIMIT 10"}'

# Aggregations work too
curl -X POST https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT type, COUNT(*) AS c FROM analytics.events GROUP BY type"}'

# Semantic API query
curl -X POST https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev/cubejs-api/v1/load \
  -H "Content-Type: application/json" \
  -d '{"query": {"dimensions": ["Events.type"], "measures": ["Events.count"], "limit": 100}}'

# Get CSV output
curl -X POST https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM analytics.events LIMIT 10", "format": "csv"}'

# List tables
curl https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev/tables/analytics

# Describe table schema
curl https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev/tables/analytics/events
```

### Via External Tools

Connect PyIceberg, DuckDB, or Spark to Basin Catalog's Iceberg REST endpoint (`https://catalog.cloudflarestorage.com/<account-id>/<bucket>`). See [Querying Data](docs/querying.md#external-query-engines) and the [Basin Catalog docs](https://developers.cloudflare.com/basin-catalog/).

## API Endpoints

### Ingestion Worker

Thes are the standard Analytics.js endpoints:

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

### Query API Worker

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/query` | POST | Execute Basin SQL query |
| `/tables/:namespace` | GET | List tables in namespace |
| `/tables/:namespace/:table` | GET | Describe table schema |
| `/cubejs-api/v1/meta` | GET | Get Cube-js compatible semantic layer metadata |
| `/cubejs-api/v1/load` | POST | Execute Cube-js compatible semantic query |
| `/health` | GET | Health check |

## Development

```bash
# Run setup
pnpm install
pnpm launch

# Run ingest worker locally
pnpm dev:ingest

# Run query worker locally
pnpm dev:query

# Build all packages
pnpm build

# Type check
pnpm typecheck
```

Note that the Ingest and Query workers connect to remote infrastructure in Cloudflare (Basin Pipelines and Basin SQL have no local emulation).

To load demo data into any ingest worker:

```bash
INGEST_API_URL=https://icelight-event-ingest.YOUR-SUBDOMAIN.workers.dev pnpm generate-events 30
```

## Cleanup

```bash
pnpm teardown
```

Teardown also removes the DuckDB worker and container left by deployments created before the move to Basin SQL.

## Troubleshooting

### "send is not a function" error

Ensure `compatibility_date` in `wrangler.local.jsonc` is `"2025-01-01"` or later (the repo uses `"2026-10-01"`). The Basin Pipelines `send()` method requires this.

### "Not logged in" error

Run `npx wrangler login` and complete the browser authorization flow.

### Pipeline binding not working

1. Check that `wrangler.local.jsonc` exists in `workers/event-ingest/` - if not, run `pnpm launch`
2. Verify the binding in `wrangler.local.jsonc` is `"pipelines": [{ "binding": "PIPELINE", "stream": "<STREAM_ID>" }]` with the correct stream ID (the older `pipeline` field is deprecated)
3. Run `npx wrangler basin pipelines streams list` to see your streams
4. Redeploy after any config changes: `pnpm deploy:ingest`

### Query API returns empty data

1. Check that data has been flushed to R2 (icelight's sink rolls every 60 seconds, so allow 1-2 minutes)
2. Verify the `WAREHOUSE_NAME` in `workers/query-api/wrangler.local.jsonc` is `<account-id>_<bucket>` (see `npx wrangler basin catalog get <bucket>`)
3. Check that `CF_ACCOUNT_ID` and `CF_API_TOKEN` secrets are set correctly

### "wrangler.local.jsonc not found" error

Run `pnpm launch` to create the local configuration files with your pipeline bindings.

## Pricing & Limits

Basin has been generally available since October 2026 and is billed per use ([pricing](https://developers.cloudflare.com/basin/platform/pricing/)):

- **Ingest**: free
- **Sink delivery (Parquet/Iceberg)**: 50 GB/month included, then $0.06/GB
- **Basin SQL**: 10 GB/month scanned included, then $2.50/TB of compressed data scanned (10 MB minimum per query)
- R2 storage is billed separately

Limits worth knowing:

- Streams, sinks and pipeline SQL **cannot be changed after creation** - delete and recreate (`pnpm teardown && pnpm launch`)
- 20 streams, 20 sinks and 20 pipelines per account; 5 MB per ingest request; 1 GB/s per stream
- Basin SQL is read-only and has no `OFFSET`, `UNNEST`, `PIVOT` or `LATERAL` (the semantic layer emulates `OFFSET`)
- **Local Development**: Basin Pipelines and Basin SQL require remote resources

## Documentation

- [Getting Started](docs/getting-started.md)
- [Configuration](docs/configuration.md)
- [Querying Data](docs/querying.md) - SQL queries, Semantic API, JSON field extraction
- [SDK Integration](docs/sdk-integration.md)

## Links

- [Cloudflare Basin](https://developers.cloudflare.com/basin/)
- [Basin Pipelines](https://developers.cloudflare.com/basin-pipelines/)
- [Basin Catalog](https://developers.cloudflare.com/basin-catalog/)
- [Basin SQL](https://developers.cloudflare.com/basin-sql/)

## License

MIT
