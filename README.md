# cdpflare

Stream JSON analytics events to Apache Iceberg tables on Cloudflare's data platform.

## Overview

cdpflare provides a complete solution for collecting analytics events and storing them in queryable Iceberg tables using Cloudflare's infrastructure:

- **Event Ingestion**: RudderStack/Segment-compatible HTTP endpoints
- **Data Storage**: Apache Iceberg tables on R2 with automatic compaction
- **Query API**: SQL queries via R2 SQL or external engines (PyIceberg, DuckDB, Spark)

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

Before you begin, you'll need:

### 1. Cloudflare Account

Sign up for a free Cloudflare account at **[dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)**

> **Note**: R2 and Pipelines are available on all plans, including free. You may need to add a payment method to enable R2.

### 2. Node.js & pnpm

- **Node.js 18+**: [nodejs.org](https://nodejs.org/)
- **pnpm 8+**: `npm install -g pnpm`

## Quick Start

### Step 1: Clone & Install

```bash
git clone https://github.com/your-org/cdpflare.git
cd cdpflare
pnpm install
```

### Step 2: Login to Cloudflare

The setup script requires authentication with Cloudflare. Run:

```bash
npx wrangler login
```

This opens a browser window to authorize wrangler. Once complete, you'll see a success message.

### Step 3: Setup Infrastructure

Run the setup script to create all Cloudflare resources and configure workers:

```bash
pnpm launch
```

You'll be prompted to enter a project name (e.g., `myproject`). The script will:

1. Check you're logged in to Cloudflare
2. Create an R2 bucket with Data Catalog enabled
3. Create a Pipeline stream with the event schema
4. Create a sink to write Parquet files to R2
5. Create a pipeline connecting the stream to the sink
6. **Automatically generate `wrangler.local.jsonc`** files for both workers with the correct configuration

> **Note**: The generated `wrangler.local.jsonc` files are gitignored and contain your account-specific pipeline bindings and warehouse settings.

### Step 4: Deploy Ingest Worker

```bash
pnpm deploy:ingest
```

You'll see output with your worker URL:
```
Deployed cdpflare-event-ingest triggers
  https://cdpflare-event-ingest.YOUR-SUBDOMAIN.workers.dev
```

### Step 5: Test Ingestion

Send a test event:

```bash
curl -X POST https://cdpflare-event-ingest.YOUR-SUBDOMAIN.workers.dev/v1/track \
  -H "Content-Type: application/json" \
  -d '{"userId":"test-user","event":"Test Event","properties":{"key":"value"}}'
```

You should receive: `{"success":true,"count":1}`

### Step 6: Deploy Query API (Optional)

The `pnpm launch` script already configured the Query API worker with the correct warehouse name and set the required secrets (`CF_ACCOUNT_ID` and `CF_API_TOKEN`). Just deploy:

```bash
pnpm deploy:query
```

> **Note**: If you skipped the Query API setup during `pnpm launch`, you can run the script again or manually set secrets:
> ```bash
> npx wrangler secret put CF_ACCOUNT_ID -c workers/query-api/wrangler.local.jsonc
> npx wrangler secret put CF_API_TOKEN -c workers/query-api/wrangler.local.jsonc
> ```

### Step 7: Test Query API

```bash
# Check health
curl https://cdpflare-query-api.YOUR-SUBDOMAIN.workers.dev/health

# Query events (after pipeline has processed data - may take a minute)
curl -X POST https://cdpflare-query-api.YOUR-SUBDOMAIN.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM analytics.events LIMIT 10"}'
```

## SDK Integration

### RudderStack / Segment

```javascript
import { Analytics } from '@rudderstack/analytics-js';

const analytics = new Analytics({
  writeKey: 'any-value', // Required by SDK, not validated if AUTH_ENABLED=false
  dataPlaneUrl: 'https://cdpflare-event-ingest.YOUR-SUBDOMAIN.workers.dev'
});

// Track events
analytics.track('Purchase Completed', {
  orderId: '12345',
  revenue: 99.99
});

// Identify users
analytics.identify('user-123', {
  email: 'user@example.com',
  plan: 'premium'
});
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

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_ENABLED` | `false` | Require authentication |
| `AUTH_TOKEN` | - | API token (set as secret if auth enabled) |
| `ALLOWED_ORIGINS` | `*` | CORS allowed origins (comma-separated) |

### Enable Authentication

```bash
# Edit workers/event-ingest/wrangler.local.jsonc and set AUTH_ENABLED to "true", then:
npx wrangler secret put AUTH_TOKEN -c workers/event-ingest/wrangler.local.jsonc
# Enter your secret token when prompted

pnpm deploy:ingest
```

Clients must then include the token:
```bash
curl -X POST https://YOUR-WORKER.workers.dev/v1/track \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"userId":"test","event":"Test"}'
```

## Query API

The Query API worker provides HTTP access to your analytics data via R2 SQL.

### Deploy Query API

The `pnpm launch` script configures everything automatically. Just deploy:

```bash
pnpm deploy:query
```

### Query Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/query` | POST | Execute SQL query |
| `/tables/:namespace` | GET | List tables in namespace |
| `/tables/:namespace/:table` | GET | Describe table schema |
| `/health` | GET | Health check |

### Example Queries

```bash
# Basic query - get recent events
curl -X POST https://cdpflare-query-api.YOUR-SUBDOMAIN.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM analytics.events LIMIT 10"}'

# Filter by event type
curl -X POST https://cdpflare-query-api.YOUR-SUBDOMAIN.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM analytics.events WHERE type = '\''track'\'' LIMIT 10"}'

# Filter by user
curl -X POST https://cdpflare-query-api.YOUR-SUBDOMAIN.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM analytics.events WHERE user_id = '\''user-123'\'' LIMIT 10"}'

# Get CSV output
curl -X POST https://cdpflare-query-api.YOUR-SUBDOMAIN.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM analytics.events LIMIT 10", "format": "csv"}'

# List tables
curl https://cdpflare-query-api.YOUR-SUBDOMAIN.workers.dev/tables/analytics

# Describe table schema
curl https://cdpflare-query-api.YOUR-SUBDOMAIN.workers.dev/tables/analytics/events
```

### Query with Authentication

If `API_TOKEN` is configured:

```bash
curl -X POST https://cdpflare-query-api.YOUR-SUBDOMAIN.workers.dev/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -d '{"sql": "SELECT * FROM analytics.events LIMIT 10"}'
```

### Via Wrangler CLI

```bash
# The warehouse name format is: {ACCOUNT_ID}_{BUCKET_NAME}
# You can find your warehouse name in the R2 Data Catalog dashboard
npx wrangler r2 sql query "YOUR_WAREHOUSE_NAME" \
  "SELECT * FROM analytics.events LIMIT 10"
```

### Via External Tools

Connect PyIceberg, DuckDB, or Spark to your R2 Data Catalog. See [Cloudflare R2 SQL docs](https://developers.cloudflare.com/r2-sql/) for connection details.

## Project Structure

```
cdpflare/
├── packages/
│   ├── core/           # Shared types and validation
│   ├── ingest/         # Ingestion library (Hono)
│   └── query/          # Query library (Hono)
├── workers/
│   ├── event-ingest/   # Ingestion worker
│   └── query-api/      # Query API worker
├── scripts/
│   └── setup-pipeline.ts   # Infrastructure setup
└── templates/
    └── schema.events.json  # Event schema
```

## Development

```bash
# Run ingest worker locally (with remote pipeline binding)
pnpm dev:ingest

# Run query worker locally
pnpm dev:query

# Build all packages
pnpm build

# Type check
pnpm typecheck
```

> **Note**: Local development uses `wrangler.local.jsonc` which contains your pipeline bindings. Run `pnpm launch` first to generate these files.

## Cleanup

```bash
# Delete pipeline resources
npx wrangler pipelines delete cdpflare_events_pipeline
npx wrangler pipelines sinks delete cdpflare_events_sink
npx wrangler pipelines streams delete cdpflare_events_stream

# Delete R2 bucket (will fail if not empty)
npx wrangler r2 bucket delete cdpflare-data
```

## Troubleshooting

### "send is not a function" error

Ensure `compatibility_date` in `wrangler.local.jsonc` is `"2025-01-01"` or later. The Pipelines `send()` method requires this.

### "Not logged in" error

Run `npx wrangler login` and complete the browser authorization flow.

### Pipeline binding not working

1. Check that `wrangler.local.jsonc` exists in `workers/event-ingest/` - if not, run `pnpm launch`
2. Verify the pipeline binding in `wrangler.local.jsonc` has the correct stream ID
3. Run `npx wrangler pipelines streams list` to see your streams
4. Redeploy after any config changes: `pnpm deploy:ingest`

### Query API returns empty data

1. Check that data has been flushed to R2 (pipelines have a 5-minute flush interval by default)
2. Verify the `WAREHOUSE_NAME` in `workers/query-api/wrangler.local.jsonc` matches your bucket name (just the bucket name, not with account ID prefix)
3. Check that `CF_ACCOUNT_ID` and `CF_API_TOKEN` secrets are set correctly

### "wrangler.local.jsonc not found" error

Run `pnpm launch` to create the local configuration files with your pipeline bindings.

## Limitations

- **Cloudflare Pipelines**: Currently in open beta - API may change
- **R2 SQL**: Read-only, limited query support (improving in 2026)
- **Local Development**: Pipelines require `--remote` flag for full testing

## Links

- [Cloudflare Pipelines Docs](https://developers.cloudflare.com/pipelines/)
- [R2 Data Catalog](https://developers.cloudflare.com/r2/data-catalog/)
- [R2 SQL](https://developers.cloudflare.com/r2-sql/)

## License

MIT
