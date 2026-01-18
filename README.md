# icelight

Stream JSON analytics events to Apache Iceberg tables on Cloudflare's data platform.

## Overview

icelight provides a complete solution for collecting analytics events and storing them in queryable Iceberg tables using Cloudflare's infrastructure:

- **Event Ingestion**: RudderStack/Segment-compatible HTTP endpoints
- **Data Storage**: Apache Iceberg tables on R2 with automatic compaction
- **Query API**: SQL queries via R2 SQL or DuckDB, plus a semantic layer

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Your App /    │────▶│  Event Ingest   │────▶│   Cloudflare    │
│  Analytics SDK  │     │    Worker       │     │    Pipeline     │
└─────────────────┘     └─────────────────┘     └────────┬────────┘
                                                         │
                        ┌─────────────────┐     ┌────────▼────────┐
                        │   Query API     │◀────│  R2 + Iceberg   │
                        │    Worker       │     │   Data Catalog  │
                        └─────────────────┘     └─────────────────┘
```

## Prerequisites

- **Cloudflare Account**: [dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up) (free tier works)
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
- Create an R2 bucket with Data Catalog enabled
- Create and configure the Pipeline (stream, sink, pipeline)
- Deploy the Event Ingest worker
- Deploy the Query API worker (with secrets configured)
- Optionally deploy the DuckDB API worker

Once complete, you'll see your worker URLs.

### 4. Open the Web UI

Visit your Query API URL in a browser:

```
https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev
```

The Web UI includes:
- **Analysis Builder**: Visual query builder with charts
- **R2 SQL**: Direct SQL queries against your Iceberg tables
- **DuckDB**: Full SQL support (JOINs, aggregations, window functions)
- **Event Simulator**: Send test events using the RudderStack SDK

**Live Demo**: https://icelight-query-api.clifton-cunningham.workers.dev/

## SDK Integration

### RudderStack / Segment

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

The Query API includes a web-based explorer at your worker URL with R2 SQL, DuckDB, and a visual Analysis Builder.

### Via API

```bash
# R2 SQL query
curl -X POST https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM analytics.events LIMIT 10"}'

# DuckDB query (full SQL support)
curl -X POST https://icelight-query-api.YOUR-SUBDOMAIN.workers.dev/duckdb \
  -H "Content-Type: application/json" \
  -d '{"query": "SELECT type, COUNT(*) FROM r2_datalake.analytics.events GROUP BY type"}'

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

Connect PyIceberg, DuckDB, or Spark to your R2 Data Catalog. See [Cloudflare R2 SQL docs](https://developers.cloudflare.com/r2-sql/) for connection details.

## API Endpoints

### Ingestion Worker

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
| `/query` | POST | Execute R2 SQL query |
| `/duckdb` | POST | Execute DuckDB query (full SQL) |
| `/tables/:namespace` | GET | List tables in namespace |
| `/tables/:namespace/:table` | GET | Describe table schema |
| `/cubejs-api/v1/meta` | GET | Get semantic layer metadata |
| `/cubejs-api/v1/load` | POST | Execute semantic query |
| `/health` | GET | Health check |

## Development

```bash
# Run ingest worker locally
pnpm dev:ingest

# Run query worker locally
pnpm dev:query

# Build all packages
pnpm build

# Type check
pnpm typecheck
```

## Cleanup

```bash
pnpm teardown
```

## Documentation

- [Getting Started](docs/getting-started.md)
- [Configuration](docs/configuration.md)
- [Querying Data](docs/querying.md) - SQL queries, Semantic API, JSON field extraction
- [SDK Integration](docs/sdk-integration.md)

## Links

- [Cloudflare Pipelines Docs](https://developers.cloudflare.com/pipelines/)
- [R2 Data Catalog](https://developers.cloudflare.com/r2/data-catalog/)
- [R2 SQL](https://developers.cloudflare.com/r2-sql/)

## License

MIT
