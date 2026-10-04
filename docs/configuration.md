# Configuration Guide

## Environment Variables

### Ingestion Worker

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `AUTH_ENABLED` | string | `"true"` | Require a write key on every request; `"false"` turns auth off |
| `AUTH_TOKEN` | secret | - | The write key. `pnpm launch` generates it (`ICELIGHT_INGEST_TOKEN` in `.env`) and sets it |
| `ALLOWED_ORIGINS` | string | `"*"` | Comma-separated list of allowed CORS origins |
| `RATE_LIMITER` | binding | 300/min | Per-IP rate limit (see [Rate limits](#rate-limits)) |

### Query Worker

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `CF_ACCOUNT_ID` | secret | Yes | Your Cloudflare account ID |
| `CF_API_TOKEN` | secret | Yes | Cloudflare API token with Basin SQL permissions |
| `WAREHOUSE_NAME` | string | Yes | Basin Catalog warehouse, `<account-id>_<bucket>` (from `wrangler basin catalog get <bucket>`) |
| `API_TOKEN` | secret | No | Optional Bearer token for queries, MCP and dashboards; also enables `X-Cache-Control: no-cache` |
| `ALLOWED_ORIGINS` | string | `"*"` | Comma-separated list of allowed CORS origins |
| `INGEST_AUTH_TOKEN` | secret | Yes, with ingest auth | The ingest worker's `AUTH_TOKEN`, used by the daily cron and the public demo proxy. Set by `pnpm launch` |
| `PUBLIC_DEMO` | string | No | `"true"` lets anonymous visitors send events through `/v1/*` (see [Public demo](#public-demo)). Set by launch from `ICELIGHT_PUBLIC_DEMO` |
| `RATE_LIMITER` | binding | No | Per-IP limit for `/query`, `/tables`, `/cubejs-api`, `/mcp`, `/api/dashboards` (300/min) |
| `DEMO_INGEST_RATE_LIMITER` | binding | No | Per-IP limit for `/v1/*` when `PUBLIC_DEMO` is on (20/min) |

### Setup Script (`.env`)

`pnpm launch` stores these in `.env` at the repo root:

| Variable | Default | Description |
|----------|---------|-------------|
| `ICELIGHT_PROJECT_NAME` | `icelight` | Project name; all resource names derive from it |
| `ICELIGHT_API_TOKEN` | - | API token used for the sink, Basin SQL and worker secrets |
| `ICELIGHT_QUERY_DOMAIN` | - | Optional custom domain for the query API / web UI (e.g. `analytics.example.com`) |
| `ICELIGHT_INGEST_TOKEN` | generated | Ingest write key. Launch generates it, sets it on both workers, and seeding sends it |
| `ICELIGHT_PUBLIC_DEMO` | - | `"true"` sets `PUBLIC_DEMO` on the query API (anonymous Event Simulator ingest) |

Resource names derived from the project name (e.g. `icelight`):

| Resource | Name |
|----------|------|
| R2 bucket (Basin Catalog enabled) | `icelight-data` |
| Basin Pipelines stream | `icelight_events_stream` |
| Basin Pipelines sink | `icelight_events_sink` (Iceberg table `analytics.events`, 60s roll interval) |
| Basin pipeline | `icelight_events_pipeline` (`INSERT INTO <sink> SELECT * FROM <stream>`) |
| KV namespace | `icelight-query-cache` |
| D1 database | `icelight-dashboards` |

`pnpm generate-events` reads `INGEST_API_URL` (default `http://localhost:8787`) and `ICELIGHT_INGEST_TOKEN` (default: from `.env`).

## Wrangler Configuration

### Ingestion Worker (`workers/event-ingest/wrangler.jsonc`)

```jsonc
{
  "name": "icelight-event-ingest",
  "main": "src/index.ts",
  "compatibility_date": "2026-10-01",
  "compatibility_flags": ["nodejs_compat"],

  "vars": {
    "AUTH_ENABLED": "true",
    "ALLOWED_ORIGINS": "*"
  },
  // AUTH_TOKEN set via wrangler secret (pnpm launch does it)

  "ratelimits": [
    { "name": "RATE_LIMITER", "namespace_id": "41001", "simple": { "limit": 300, "period": 60 } }
  ],

  // Added to wrangler.local.jsonc by pnpm launch.
  // The binding points at the Basin Pipelines *stream* ID (the older `pipeline` field is deprecated).
  "pipelines": [
    {
      "binding": "PIPELINE",
      "stream": "<STREAM_ID>"
    }
  ]
}
```

### Query Worker (`workers/query-api/wrangler.jsonc`)

```jsonc
{
  "name": "icelight-query-api",
  "main": "src/index.ts",
  "compatibility_date": "2026-10-01",
  "compatibility_flags": ["nodejs_compat"],

  "vars": {
    "WAREHOUSE_NAME": "<account-id>_<bucket>"
  },
  // CF_ACCOUNT_ID, CF_API_TOKEN, INGEST_AUTH_TOKEN set via wrangler secret

  // Proxies /v1/* to the ingest worker (used by the UI's event simulator and the daily cron)
  "services": [
    { "binding": "INGEST_API", "service": "icelight-event-ingest", "remote": true }
  ],

  "ratelimits": [
    { "name": "RATE_LIMITER", "namespace_id": "41002", "simple": { "limit": 300, "period": 60 } },
    { "name": "DEMO_INGEST_RATE_LIMITER", "namespace_id": "41003", "simple": { "limit": 20, "period": 60 } }
  ]
}
```

## Authentication

### Ingestion Authentication

Authentication is on by default (`AUTH_ENABLED: "true"`). `pnpm launch` generates a write key, saves it to `.env` as `ICELIGHT_INGEST_TOKEN`, and sets it as the ingest worker's `AUTH_TOKEN` and the query worker's `INGEST_AUTH_TOKEN` secrets. Seeding (`pnpm launch`, `pnpm reseed`, `pnpm generate-events`) sends it automatically.

Clients can send the write key in any of these:

1. **Bearer Token**: `Authorization: Bearer <token>`
2. **Basic Auth**: `Authorization: Basic <base64>` (username is the token). This is what Analytics.js SDKs send for `writeKey`
3. **API Key Header**: `X-API-Key: <token>`

A write key in browser code is visible to anyone, so the per-IP [rate limit](#rate-limits) is what bounds abuse.

**Upgrading a deployment created before auth was on by default**: run `pnpm launch`. If you only run `pnpm deploy:ingest`, every request returns 500 "Authentication is enabled but no token is configured" until you set the token by hand:

```bash
TOKEN=$(openssl rand -base64 32)
echo "ICELIGHT_INGEST_TOKEN=\"$TOKEN\"" >> .env
echo "$TOKEN" | npx wrangler secret put AUTH_TOKEN --config workers/event-ingest/wrangler.local.jsonc
echo "$TOKEN" | npx wrangler secret put INGEST_AUTH_TOKEN --config workers/query-api/wrangler.local.jsonc
```

To turn auth off, set `"AUTH_ENABLED": "false"` and redeploy.

### Query API Authentication

Optional Bearer token authentication, recommended for private deployments:

```bash
# Set the secret
wrangler secret put API_TOKEN --config workers/query-api/wrangler.local.jsonc

# Redeploy
pnpm deploy:query
```

Requests to `/query`, `/tables`, `/cubejs-api`, `/mcp` and `/api/dashboards` must then include `Authorization: Bearer <token>`. The web UI reads `GET /api/config` (always public) and shows a token field in the navbar when auth is required.

`X-Cache-Control: no-cache` (skip the KV query cache) is only honoured when `API_TOKEN` is set, so anonymous callers can't force billed Basin SQL queries.

## Rate Limits

Both workers use [Workers rate limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/) bindings, keyed by client IP (`CF-Connecting-IP`). Over the limit, requests get 429 with `Retry-After: 60`.

| Worker | Binding | Default | Applies to |
|--------|---------|---------|-----------|
| Ingest | `RATE_LIMITER` | 300/min | All POSTs; bodies are also capped at 2 MB |
| Query | `RATE_LIMITER` | 300/min | `/query`, `/tables`, `/cubejs-api`, `/mcp`, `/api/dashboards`, `/v1/*` |
| Query | `DEMO_INGEST_RATE_LIMITER` | 20/min | `/v1/*` when `PUBLIC_DEMO` is on; bodies capped at 64 KB |

To change a limit, edit `ratelimits` in the worker's `wrangler.jsonc`, then `pnpm launch` (to regenerate `wrangler.local.jsonc`) and redeploy. `period` must be `10` or `60` seconds. `namespace_id` is any integer, but must be unique per rate limiter in your account: workers that share an ID share counters. A dashboard load is about 25 requests, so don't set the query limit much below 60.

The limits are approximate (counted per Cloudflare location). For stricter control, set `"workers_dev": false` so all traffic goes through your [custom domain](#custom-domain), then add a WAF rate-limiting rule on that zone. workers.dev URLs bypass zone WAF rules.

## Public Demo

Set `ICELIGHT_PUBLIC_DEMO="true"` in `.env` and run `pnpm launch` to let anonymous visitors use the Event Simulator. The query worker's `/v1/*` proxy then adds `INGEST_AUTH_TOKEN` to requests on their behalf, limited to 20 requests per minute per IP and 64 KB per request. Without it, the simulator asks for the write key.

## CORS Configuration

Both workers support CORS configuration via `ALLOWED_ORIGINS`:

```jsonc
"vars": {
  "ALLOWED_ORIGINS": "https://myapp.com,https://staging.myapp.com"
}
```

Use `"*"` to allow all origins (not recommended for production).

## Cloudflare API Token Permissions

icelight uses one API token, saved to `.env` as `ICELIGHT_API_TOKEN`. `pnpm launch` prompts for it and also sets it as the query worker's `CF_API_TOKEN` secret.

To create it:

1. Go to [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) → **Create Token** → **Create Custom Token**
2. Add these **Account** permissions:

   | Permission | Access | Used for |
   |------------|--------|----------|
   | Basin Catalog | Edit | The pipeline sink creates and writes the `analytics.events` Iceberg table |
   | Basin SQL | Read | The query API's `/query` endpoint and the drizzle-cube semantic layer |
   | Workers R2 Storage | Edit | Reading Iceberg data files; `pnpm teardown` empties the bucket |
   | Workers Scripts | Read | Looking up your `workers.dev` subdomain during launch |

3. Under **Account Resources**, choose **Include** → your account
4. **Continue to summary** → **Create Token**, then copy the token value

Notes:

- Older dashboards, and the API permission group names, call these **Workers R2 Data Catalog** and **Workers R2 SQL**. They're the same permissions.
- Don't use an R2 token from **R2 → Manage API tokens**. It covers Basin Catalog, Basin SQL and storage, but not **Workers Scripts**.
- No **Basin Pipelines** permission is needed. Wrangler creates the stream, sink and pipeline, and deploys the workers, with your `wrangler login` session, not this token. The ingest worker writes through the stream binding, which needs no token. (If your shell exports `CLOUDFLARE_API_TOKEN`, wrangler uses that token instead of your login, so that token needs Basin Pipelines Edit plus Workers, KV and D1 edit permissions.)

## Custom Domain

To serve the query API and web UI on your own domain:

1. Add the domain's zone to your Cloudflare account
2. Set it in `.env`:

   ```bash
   ICELIGHT_QUERY_DOMAIN=analytics.example.com
   ```

3. Run `pnpm launch` (or `pnpm deploy:query` after relaunching). Launch adds the domain to the query worker as a [Workers custom domain](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/), and Cloudflare creates the DNS record and certificate.

For the ingest worker, add a `routes` entry by hand to `workers/event-ingest/wrangler.local.jsonc`:

```jsonc
{
  "routes": [{ "pattern": "events.example.com", "custom_domain": true }]
}
```

Launch regenerates `wrangler.local.jsonc`, so re-add it after relaunching.
