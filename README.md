# cdpflare

Stream JSON data to Apache Iceberg tables on Cloudflare's data platform.

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/your-org/cdpflare)

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

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Cloudflare account with R2 enabled
- Wrangler CLI (`npm install -g wrangler`)

### Installation

```bash
git clone https://github.com/your-org/cdpflare.git
cd cdpflare
pnpm install
pnpm build
```

### Setup Infrastructure

```bash
# Create R2 bucket, Data Catalog, and Pipeline
pnpm setup
```

### Deploy Workers

```bash
# Deploy ingestion worker
pnpm deploy:ingest

# Configure query worker secrets
wrangler secret put CF_ACCOUNT_ID --config workers/query-api/wrangler.jsonc
wrangler secret put CF_API_TOKEN --config workers/query-api/wrangler.jsonc

# Deploy query worker
pnpm deploy:query
```

### Configure Analytics SDK

```javascript
import { Analytics } from '@rudderstack/analytics-js';

const analytics = new Analytics({
  writeKey: 'your-write-key', // or any value if auth disabled
  dataPlaneUrl: 'https://cdpflare-event-ingest.your-subdomain.workers.dev'
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

### Query Data

```bash
# Via wrangler CLI
npx wrangler r2 sql query "your-warehouse" "SELECT * FROM analytics.events LIMIT 10"

# Via Query API
curl -X POST https://cdpflare-query-api.your-subdomain.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM analytics.events LIMIT 10"}'
```

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
│   ├── setup-pipeline.ts   # Infrastructure setup
│   └── teardown.ts         # Infrastructure cleanup
├── templates/
│   ├── schema.events.json  # Event schema
│   └── .env.example        # Environment template
└── docs/
    ├── getting-started.md
    ├── configuration.md
    ├── sdk-integration.md
    └── querying.md
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

### Query Worker

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/query` | POST | Execute SQL query |
| `/tables/:namespace` | GET | List tables |
| `/tables/:namespace/:table` | GET | Describe table |
| `/health` | GET | Health check |

## Configuration

See [Configuration Guide](docs/configuration.md) for detailed environment variables.

### Ingestion Worker

| Variable | Default | Description |
|----------|---------|-------------|
| `AUTH_ENABLED` | `false` | Require authentication |
| `AUTH_TOKEN` | - | API token (if auth enabled) |
| `ALLOWED_ORIGINS` | `*` | CORS allowed origins |

### Query Worker

| Variable | Required | Description |
|----------|----------|-------------|
| `CF_ACCOUNT_ID` | Yes | Cloudflare account ID |
| `CF_API_TOKEN` | Yes | Cloudflare API token |
| `WAREHOUSE_NAME` | Yes | R2 SQL warehouse name |
| `API_TOKEN` | No | Optional auth token |

## Documentation

- [Getting Started](docs/getting-started.md)
- [Configuration](docs/configuration.md)
- [SDK Integration](docs/sdk-integration.md)
- [Querying Data](docs/querying.md)

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
# Delete all infrastructure (keeps data)
pnpm teardown -- --keep-bucket

# Delete everything including data
pnpm teardown
```

## Limitations

- **Cloudflare Pipelines**: Currently in open beta
- **R2 SQL**: Read-only, no joins/aggregations yet (coming H1 2026)
- **Deploy Button**: Pipelines not auto-provisioned (requires manual setup)

## License

MIT
