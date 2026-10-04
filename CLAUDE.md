# CLAUDE.md - Project Context for Claude Code

## Project Overview

**icelight** is a Cloudflare Basin library that streams JSON analytics events to Apache Iceberg tables. It provides RudderStack/Segment-compatible HTTP endpoints for event ingestion and a query API (SQL + drizzle-cube semantic layer) on Basin SQL.

Cloudflare Basin (GA 2026-10-01) is the renamed Cloudflare Data Platform: **Basin Pipelines** (formerly Pipelines), **Basin Catalog** (formerly R2 Data Catalog) and **Basin SQL** (formerly R2 SQL).

### Architecture

```
Client/SDK → Event Ingest Worker → Basin Pipelines (stream → pipeline → sink) → R2 + Iceberg (Basin Catalog) → Basin SQL ← Query API Worker
```

- **Event Ingestion**: Hono-based worker accepting analytics events, sending to a Basin Pipelines stream binding
- **Data Storage**: Basin Pipelines sink writes Parquet/Iceberg to R2, managed by Basin Catalog
- **Querying**: Basin SQL for raw SQL and the drizzle-cube semantic layer; external engines (PyIceberg, DuckDB, Spark) can read via the Basin Catalog Iceberg REST endpoint

## Repository Structure

```
icelight/
├── packages/                    # Shared libraries
│   ├── core/                    # @icelight/core - Types & validation
│   │   └── src/
│   │       ├── event-schema.ts  # RudderStack/Segment event types
│   │       ├── validation.ts    # Event validation & flattening
│   │       └── config.ts        # Configuration types
│   └── sql-guard/               # @icelight/sql-guard - SQL validation for /query
├── workers/                     # Deployable Cloudflare Workers
│   ├── event-ingest/            # Self-contained ingest worker
│   │   └── src/
│   │       ├── handler.ts       # Hono app factory and routes
│   │       ├── auth.ts          # Authentication middleware
│   │       └── batch.ts         # Event processing logic
│   └── query-api/               # Query API, semantic layer and UI
│       ├── src/query/
│       │   ├── handler.ts       # Hono app factory (createQueryApp)
│       │   ├── basin-sql.ts     # Basin SQL REST client
│       │   ├── basin-drizzle.ts # drizzle pg-proxy driver for drizzle-cube on Basin SQL
│       │   ├── formatter.ts     # JSON/CSV output formatting
│       │   ├── schema/          # Drizzle schema (analytics.events)
│       │   └── cubes/           # drizzle-cube definitions + JSON helpers
│       └── ui/                  # Vite + React query explorer
├── scripts/                     # Infrastructure management
│   ├── setup/                   # pnpm launch (Ink UI): Basin resources, deploy, demo seed
│   ├── teardown/                # pnpm teardown (also removes legacy DuckDB worker/container)
│   ├── shared/                  # Shared Ink components + seed-events.ts
│   └── generate-events.ts       # pnpm generate-events (demo data)
├── templates/                   # Configuration templates
│   ├── schema.events.json       # Basin Pipelines stream schema
│   └── .env.example             # Environment template
└── docs/                        # Documentation
```

## Local Configuration Pattern

**IMPORTANT**: Workers use `wrangler.local.jsonc` for deployment, NOT `wrangler.jsonc`.

- `wrangler.jsonc` - Template/example config (committed to git)
- `wrangler.local.jsonc` - Actual config with stream bindings, warehouse name, KV/D1 IDs (gitignored, created by `pnpm launch`)

The `pnpm launch` script creates `wrangler.local.jsonc` files in each worker directory with the correct Basin stream ID and warehouse for your Cloudflare account.

```bash
# This creates wrangler.local.jsonc files with your stream bindings
pnpm launch

# Deploy commands automatically use wrangler.local.jsonc
pnpm deploy:ingest   # Uses workers/event-ingest/wrangler.local.jsonc
pnpm deploy:query    # Uses workers/query-api/wrangler.local.jsonc
```

When debugging deployment issues, always check `wrangler.local.jsonc` (not `wrangler.jsonc`) to verify the stream binding (`"pipelines": [{ "binding": "PIPELINE", "stream": "<STREAM_ID>" }]`) is configured.

## Build & Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Type check all packages
pnpm typecheck

# Run ingest worker locally
pnpm dev:ingest

# Run query worker locally
pnpm dev:query

# Redeploy after code changes (uses existing wrangler.local.jsonc, no infra changes)
pnpm deploy:query    # Query API + UI (builds the UI first) - most common
pnpm deploy:ingest   # Event ingest worker
pnpm deploy:all

# Infrastructure
pnpm launch     # Create R2 bucket, Basin Catalog, stream/sink/pipeline, deploy workers, seed demo data
pnpm teardown   # Delete infrastructure

# Demo data
INGEST_API_URL=<ingest url> pnpm generate-events [days] [batchSize]
```

### Redeploying vs relaunching

- **Code changes only** (query API, UI, dashboards, cubes, ingest handler): `pnpm deploy:query` / `pnpm deploy:ingest`. Fast, touches nothing else.
- **Missing or broken infrastructure / regenerate `wrangler.local.jsonc`**: `pnpm launch` (idempotent - skips resources that exist, prompts before redeploying workers).
- **Schema or pipeline changes**: `pnpm teardown && pnpm launch` (streams, sinks and pipeline SQL are immutable). Teardown deletes all event data unless `--keep-bucket`.
- **Default dashboard** (`workers/query-api/src/dashboards/default-dashboard.ts`) is stored in D1: redeploying doesn't change an existing copy. Refresh it from the UI, or wait for the daily cron (02:00 UTC) which re-saves it.
- **Custom domain**: set `ICELIGHT_QUERY_DOMAIN` in `.env`; launch adds it as a Workers custom domain (and keeps workers.dev enabled).

### Query API surfaces

- `POST /query` - Basin SQL
- `/cubejs-api/v1/*` - drizzle-cube semantic API (dashboards, Analysis Builder)
- `/mcp` - drizzle-cube MCP server (tools: discover, validate, load, chart)
- `/api/dashboards` - D1 dashboard storage

To check semantic-layer queries against a deployed worker, call `/cubejs-api/v1/load?query=<url-encoded JSON>` with header `X-Cache-Control: no-cache` (bypasses the KV result cache).

## Tech Stack

- **Runtime**: Cloudflare Workers
- **Framework**: [Hono](https://hono.dev/) v4.x - lightweight web framework
- **Package Manager**: pnpm with workspaces
- **Language**: TypeScript 5.x (strict mode)
- **Build**: TypeScript compiler (tsc) - no bundler for packages
- **Workers Build**: Wrangler handles bundling

## Code Conventions

### TypeScript

- Strict mode enabled (`strict: true`)
- Use `type` imports for type-only imports: `import type { Foo } from './foo.js'`
- Include `.js` extension in relative imports (ESM requirement)
- Prefer interfaces over types for object shapes
- Use `satisfies` for type-safe object literals with inference

### Hono Patterns

```typescript
// App factory pattern - each package exports a createXxxApp function
export function createIngestApp() {
  const app = new Hono<{ Bindings: IngestEnv }>();

  // Middleware
  app.use('*', cors({ ... }));
  app.use('*', authMiddleware(...));

  // Routes
  app.post('/v1/batch', async (c) => { ... });

  return app;
}

// Default export for direct use
export default createIngestApp();
```

### Context Types

```typescript
// Define environment bindings
interface IngestEnv {
  PIPELINE?: PipelineBinding;
  AUTH_ENABLED?: string;
  AUTH_TOKEN?: string;
}

// Type the context
type IngestContext = Context<{ Bindings: IngestEnv }>;

// Use in handlers
async function handleRequest(c: IngestContext) {
  const token = c.env.AUTH_TOKEN;
  return c.json({ success: true });
}
```

### Error Handling

- Return JSON responses with `{ success: boolean, error?: string }`
- Use appropriate HTTP status codes (400 for client errors, 500 for server errors)
- Log errors with `console.error()` (available in Workers)

### File Naming

- `kebab-case.ts` for files
- `PascalCase` for types/interfaces
- `camelCase` for functions/variables
- `SCREAMING_SNAKE_CASE` for environment variables

## Key Interfaces

### Event Types (packages/core)

```typescript
// Base event - all events extend this
interface BaseEvent {
  userId?: string;
  anonymousId?: string;
  type: 'track' | 'identify' | 'page' | 'screen' | 'group' | 'alias';
  context?: EventContext;
  timestamp?: string;
  messageId?: string;
}

// Flattened for Iceberg storage (snake_case)
interface FlattenedEvent {
  message_id: string;
  type: EventType;
  user_id: string | null;
  anonymous_id: string | null;
  event: string | null;
  properties: Record<string, unknown> | null;
  timestamp: string;
  received_at: string;
}
```

### Pipeline Binding

```typescript
// Basin Pipelines stream binding (matches Pipeline<T> from "cloudflare:pipelines")
// wrangler: "pipelines": [{ "binding": "PIPELINE", "stream": "<STREAM_ID>" }]
interface PipelineBinding {
  send(records: FlattenedEvent[]): Promise<void>;
}
```

### Worker Environment

```typescript
// Ingest worker
interface IngestEnv {
  PIPELINE?: PipelineBinding;
  AUTH_ENABLED?: string;
  AUTH_TOKEN?: string;
  ALLOWED_ORIGINS?: string;
}

// Query worker
interface QueryEnv {
  CF_ACCOUNT_ID: string;
  CF_API_TOKEN: string;
  WAREHOUSE_NAME: string;   // Basin Catalog warehouse: <account-id>_<bucket>
  API_TOKEN?: string;
  ALLOWED_ORIGINS?: string;
  INGEST_API?: Fetcher;     // Service binding to ingest worker (/v1/* proxy, cron)
  INGEST_API_URL?: string;
  CACHE?: KVNamespace;      // drizzle-cube query cache
  DB?: D1Database;          // Dashboard storage
}
```

## Testing Locally

### Test Ingest Worker

```bash
# Start local dev server
pnpm dev:ingest

# Send test event
curl -X POST http://localhost:8787/v1/track \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "event": "Test Event",
    "properties": {"foo": "bar"}
  }'

# Send batch
curl -X POST http://localhost:8787/v1/batch \
  -H "Content-Type: application/json" \
  -d '{
    "batch": [
      {"type": "track", "userId": "u1", "event": "Event 1"},
      {"type": "identify", "userId": "u1", "traits": {"name": "Test"}}
    ]
  }'
```

### Test Query Worker

```bash
# Start local dev server (needs secrets configured)
pnpm dev:query

# Execute query
curl -X POST http://localhost:8788/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM analytics.events LIMIT 10"}'
```

## Cloudflare Resources

Cloudflare Basin has been GA since 2026-10-01 and is billed per use ([pricing](https://developers.cloudflare.com/basin/platform/pricing/)). Basin Pipelines requires the Workers Paid plan.

### Basin Pipelines (formerly Pipelines)

- Stream binding requires the stream to be created first via `pnpm launch`
- Immutable: stream schemas, sinks and pipeline SQL cannot be modified, only deleted/recreated
- Events that don't match the stream schema are accepted at ingest but dropped during processing
- Limits: 20 streams/sinks/pipelines per account, 5 MB per request, 1 GB/s per stream
- Sink type is still `r2-data-catalog` in wrangler (docs also mention `basin-catalog`); Iceberg sinks need a roll interval of at least 60s
- `wrangler basin pipelines sinks list --json` prints a JS object literal, not strict JSON - `parseBasinList()` in `scripts/setup/core/wrangler.ts` handles both

### Basin SQL (formerly R2 SQL)

- Read-only (SELECT, SHOW, DESCRIBE, EXPLAIN)
- Supports aggregations, GROUP BY/HAVING, joins, CTEs, window functions, set operations, JSON functions (`json_get_str`, `json_get_float`, ...)
- No `OFFSET` (emulated in `basin-drizzle.ts`), `UNNEST`, `PIVOT`, `LATERAL`; no bound parameters (inlined in `basin-drizzle.ts`)
- Default `LIMIT 500`; billed at $2.50/TB compressed bytes scanned (10 MB minimum per query)
- REST: `POST https://api.sql.cloudflarestorage.com/api/v1/accounts/<account-id>/basin-sql/query/<bucket>` with `{ warehouse, query }`
- drizzle-cube runs on Basin SQL via its `postgres` adapter. Known limits for flow (user journey) queries:
  - Set `joinStrategy: "window"` - the default (`auto`) uses `LATERAL`, which Basin rejects
  - Keep `stepsBefore + stepsAfter` small (2 + 3 works) - deeper flows hit "query expression too deep"
  - Don't set `entityLimit` - it triggers a Basin planner error ("partition 1 not available")

### Wrangler Commands Reference

Requires wrangler 4.145.0+ (repo pins `^4.147.0`). The old `wrangler pipelines`, `wrangler r2 bucket catalog` and `wrangler r2 sql` commands are hidden aliases.

```bash
# R2 + Basin Catalog
wrangler r2 bucket create <name>
wrangler basin catalog enable <bucket>
wrangler basin catalog get <bucket>          # Catalog URI + warehouse name

# Basin SQL (needs WRANGLER_BASIN_SQL_AUTH_TOKEN or CLOUDFLARE_API_TOKEN)
wrangler basin sql query "<warehouse>" "<sql>"

# Basin Pipelines
wrangler basin pipelines streams create <name> --schema-file <path> --http-enabled true --http-auth false
wrangler basin pipelines sinks create <name> --type r2-data-catalog --bucket <bucket> \
  --namespace analytics --table events --roll-interval 60 --catalog-token <token>
wrangler basin pipelines create <name> --sql "INSERT INTO <sink> SELECT * FROM <stream>"
wrangler basin pipelines {streams,sinks,} list --json
wrangler basin pipelines {streams,sinks,} delete <id> --force

# Secrets
wrangler secret put <NAME> --config <wrangler.jsonc>

# Deploy
wrangler deploy --config <wrangler.jsonc>
```

## Common Tasks

### Add a New Event Type

1. Add type to `packages/core/src/event-schema.ts`
2. Update `AnalyticsEvent` union type
3. Update validation in `packages/core/src/validation.ts`
4. Rebuild: `pnpm build`

### Add a New Endpoint

1. Add route in `workers/event-ingest/src/handler.ts` or `workers/query-api/src/query/handler.ts`
2. Create handler function with proper typing
3. Rebuild and typecheck: `pnpm build && pnpm typecheck`

### Modify Pipeline Schema

1. Update `templates/schema.events.json`
2. Update `FlattenedEvent` type in `packages/core/src/event-schema.ts`
3. Update `flattenEvent()` in `packages/core/src/validation.ts`
4. Update `workers/query-api/src/query/schema/events.ts` (and cubes if needed)
5. **Note**: Existing streams/sinks/pipelines cannot be modified - must teardown and recreate

### Add New Configuration Option

1. Add to relevant `*Env` interface in handler
2. Add to `templates/.env.example`
3. Document in `docs/configuration.md`
4. Update `wrangler.jsonc` if needed

## Debugging Tips

- Use `console.log()` in Workers - visible in `wrangler dev` output
- Check Cloudflare dashboard for deployed worker logs
- Use `--local` flag with wrangler for fully local testing
- Pipeline errors (including dropped events that don't match the schema) appear in the Cloudflare dashboard under Basin Pipelines
- Use `wrangler basin sql query` to check what has landed in `analytics.events`

## Dependencies

### Core Dependencies

- `hono` - Web framework for Workers
- `drizzle-orm` (`^0.45`) + `drizzle-cube` (`^0.10.1`) - Semantic layer in query-api (runs on Basin SQL via `drizzle-orm/pg-proxy`)
- `@icelight/sql-guard` - SQL validation for `/query`

### Dev Dependencies

- `@cloudflare/workers-types` - TypeScript types for Workers APIs
- `wrangler` - Cloudflare CLI for development and deployment
- `typescript` - TypeScript compiler
- `tsx` - TypeScript execution for scripts
- `@types/node` - Node.js types for scripts

## Links

- [Cloudflare Basin](https://developers.cloudflare.com/basin/)
- [Basin Pipelines](https://developers.cloudflare.com/basin-pipelines/)
- [Basin Catalog](https://developers.cloudflare.com/basin-catalog/)
- [Basin SQL](https://developers.cloudflare.com/basin-sql/)
- [Basin Pricing](https://developers.cloudflare.com/basin/platform/pricing/)
- [Drizzle Cube](https://try.drizzle-cube.dev)
- [Hono Documentation](https://hono.dev/)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
