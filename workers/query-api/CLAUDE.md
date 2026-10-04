# query-api Worker

Cloudflare Worker for querying analytics data via Basin SQL, with a drizzle-cube semantic layer and a web UI.

## Purpose

Deployable worker that:
- Proxies SQL queries to Cloudflare's Basin SQL API (formerly R2 SQL) for Iceberg tables in Basin Catalog
- Serves a Cube.js-compatible semantic API (drizzle-cube) that also runs on Basin SQL
- Stores dashboards in D1 and caches semantic queries in KV
- Serves the query explorer UI (`ui/`) as static assets
- Proxies `/v1/*` to the ingest worker and seeds demo events daily via cron

## Architecture

```
Client / UI → query-api Worker ──┬─ /query, /tables ─────────────→ Basin SQL API → Iceberg tables (Basin Catalog)
                                 ├─ /cubejs-api (drizzle-cube) ──→ Basin SQL API
                                 ├─ /api/dashboards ─────────────→ D1
                                 └─ /v1/* ───────────────────────→ event-ingest Worker (service binding)
```

## Files

| File | Description |
|------|-------------|
| `src/index.ts` | Worker entry point (fetch + scheduled handlers) |
| `src/cube-config.ts` | Per-deployment JSON field configuration for the Events cube |
| `src/query/handler.ts` | Hono app factory (`createQueryApp`) and routes |
| `src/query/basin-sql.ts` | Basin SQL REST client (`executeQuery`, `listTables`, `describeTable`) |
| `src/query/basin-drizzle.ts` | drizzle `pg-proxy` driver for Basin SQL (param inlining, OFFSET emulation) |
| `src/query/schema/events.ts` | Drizzle schema: `pgSchema('analytics').table('events')` |
| `src/query/cubes/events.ts` | Events cube (measures/dimensions) |
| `src/query/cubes/json-helpers.ts` | JSON dimension helpers using `json_get_str/float/bool` |
| `src/query/formatter.ts` | JSON/CSV output formatting |
| `src/cache/` | KV cache provider for drizzle-cube |
| `src/dashboards/` | D1-backed dashboard routes |
| `src/cron/` | Daily demo event generation |
| `ui/` | Vite + React query explorer (drizzle-cube client) |

## Semantic Layer on Basin SQL

drizzle-cube (`^0.10.1`) compiles queries with its `postgres` engine adapter. `createBasinDrizzle()` builds a drizzle `pg-proxy` database whose callback:

1. Inlines `$1, $2, ...` parameters as escaped SQL literals (Basin SQL has no bound parameters)
2. Rewrites `LIMIT n OFFSET m` to `LIMIT n+m` and drops the first `m` rows (Basin SQL has no `OFFSET`)
3. Sends the SQL to Basin SQL and maps rows to positional arrays in schema order

Note: drizzle-cube rebuilds its executor from `(drizzle, schema, engineType)` on every query, so Basin-specific behaviour must live in the driver callback, not in a custom `DatabaseExecutor`.

## Configuration

### wrangler.jsonc

```jsonc
{
  "name": "icelight-query-api",
  "main": "src/index.ts",
  "compatibility_date": "2026-10-01",
  "compatibility_flags": ["nodejs_compat"],

  "vars": {
    "WAREHOUSE_NAME": "<account-id>_<bucket>"
  },
  "services": [
    { "binding": "INGEST_API", "service": "icelight-event-ingest", "remote": true }
  ]
  // CF_ACCOUNT_ID, CF_API_TOKEN set via wrangler secret
  // kv_namespaces (CACHE) and d1_databases (DB) added to wrangler.local.jsonc by pnpm launch
}
```

### Environment Variables

| Variable | Required | How to Set | Description |
|----------|----------|------------|-------------|
| `CF_ACCOUNT_ID` | Yes | Secret | Cloudflare account ID |
| `CF_API_TOKEN` | Yes | Secret | API token with Basin SQL Read, Basin Catalog and R2 Storage permissions |
| `WAREHOUSE_NAME` | Yes | Var | Basin Catalog warehouse, `<account-id>_<bucket>` |
| `API_TOKEN` | No | Secret | Optional Bearer token for API auth |
| `ALLOWED_ORIGINS` | No | Var | Comma-separated CORS origins |
| `INGEST_API` / `INGEST_API_URL` | No | Service binding / Var | Ingest worker for `/v1/*` proxy and cron |
| `CACHE` | No | KV binding | drizzle-cube query cache |
| `DB` | No | D1 binding | Dashboard storage |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/query` | Execute Basin SQL query (`{ sql, format? }`) |
| GET | `/tables/:namespace` | List tables in namespace |
| GET | `/tables/:namespace/:table` | Describe table schema |
| GET | `/cubejs-api/v1/meta` | Semantic layer metadata |
| GET/POST | `/cubejs-api/v1/load` | Execute semantic query |
| * | `/api/dashboards` | Dashboard CRUD (D1) |
| * | `/v1/*` | Proxy to ingest worker |
| GET | `/health` | Health check |

## Development

```bash
# Run locally (needs wrangler.local.jsonc from pnpm launch)
pnpm dev

# Type check
pnpm typecheck

# Deploy (builds the UI first)
pnpm deploy
```

## Usage Examples

### Execute Query

```bash
curl -X POST https://icelight-query-api.<subdomain>.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT type, COUNT(*) AS c FROM analytics.events GROUP BY type"}'
```

### Get CSV Output

```bash
curl -X POST https://icelight-query-api.<subdomain>.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM analytics.events LIMIT 10", "format": "csv"}'
```

### List Tables

```bash
curl https://icelight-query-api.<subdomain>.workers.dev/tables/analytics
```

### Describe Table

```bash
curl https://icelight-query-api.<subdomain>.workers.dev/tables/analytics/events
```

### With Authentication

```bash
curl -X POST https://icelight-query-api.<subdomain>.workers.dev/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-token" \
  -d '{"sql": "SELECT * FROM analytics.events LIMIT 10"}'
```

## Basin SQL Notes

- **Supported**: aggregations, `GROUP BY`/`HAVING`, joins, CTEs, subqueries, window functions, set operations, JSON functions
- **Not supported**: writes/DDL, `OFFSET` (emulated by the semantic layer driver), `UNNEST`, `PIVOT`, `LATERAL`
- **Default `LIMIT 500`**; `/query` also requires a `LIMIT` (max 10,000) on non-aggregated queries
- **Billing**: $2.50/TB compressed bytes scanned (10 MB minimum per query); `/query` returns `meta.metrics.bytesScanned`

## Notes

- Worker URL pattern: `https://icelight-query-api.<subdomain>.workers.dev`
- Data must exist in R2 (run events through the ingest worker first, or `pnpm generate-events`)
- Query errors return 400 with the error message from the Basin SQL API
