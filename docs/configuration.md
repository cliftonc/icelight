# Configuration Guide

## Environment Variables

### Ingestion Worker

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `AUTH_ENABLED` | string | `"false"` | Set to `"true"` to require authentication |
| `AUTH_TOKEN` | secret | - | API token for authentication (set via `wrangler secret`) |
| `ALLOWED_ORIGINS` | string | `"*"` | Comma-separated list of allowed CORS origins |

### Query Worker

| Variable | Type | Required | Description |
|----------|------|----------|-------------|
| `CF_ACCOUNT_ID` | secret | Yes | Your Cloudflare account ID |
| `CF_API_TOKEN` | secret | Yes | Cloudflare API token with Basin SQL permissions |
| `WAREHOUSE_NAME` | string | Yes | Basin Catalog warehouse, `<account-id>_<bucket>` (from `wrangler basin catalog get <bucket>`) |
| `API_TOKEN` | secret | No | Optional Bearer token for query API authentication |
| `ALLOWED_ORIGINS` | string | `"*"` | Comma-separated list of allowed CORS origins |

### Setup Script (`.env`)

`pnpm launch` stores these in `.env` at the repo root:

| Variable | Default | Description |
|----------|---------|-------------|
| `ICELIGHT_PROJECT_NAME` | `icelight` | Project name; all resource names derive from it |
| `ICELIGHT_API_TOKEN` | - | API token used for the sink, Basin SQL and worker secrets |

Resource names derived from the project name (e.g. `icelight`):

| Resource | Name |
|----------|------|
| R2 bucket (Basin Catalog enabled) | `icelight-data` |
| Basin Pipelines stream | `icelight_events_stream` |
| Basin Pipelines sink | `icelight_events_sink` (Iceberg table `analytics.events`, 60s roll interval) |
| Basin pipeline | `icelight_events_pipeline` (`INSERT INTO <sink> SELECT * FROM <stream>`) |
| KV namespace | `icelight-query-cache` |
| D1 database | `icelight-dashboards` |

`pnpm generate-events` reads `INGEST_API_URL` (default `http://localhost:8787`).

## Wrangler Configuration

### Ingestion Worker (`workers/event-ingest/wrangler.jsonc`)

```jsonc
{
  "name": "icelight-event-ingest",
  "main": "src/index.ts",
  "compatibility_date": "2026-10-01",
  "compatibility_flags": ["nodejs_compat"],

  "vars": {
    "AUTH_ENABLED": "false",
    "ALLOWED_ORIGINS": "*"
  },

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
  // CF_ACCOUNT_ID, CF_API_TOKEN set via wrangler secret

  // Proxies /v1/* to the ingest worker (used by the UI's event simulator and the daily cron)
  "services": [
    { "binding": "INGEST_API", "service": "icelight-event-ingest", "remote": true }
  ]
}
```

## Authentication

### Ingestion Authentication

The ingestion worker supports multiple authentication methods:

1. **Bearer Token**: `Authorization: Bearer <token>`
2. **Basic Auth**: `Authorization: Basic <base64>` (username is the token)
3. **API Key Header**: `X-API-Key: <token>`

To enable authentication:

```bash
# Set the secret
wrangler secret put AUTH_TOKEN --config workers/event-ingest/wrangler.jsonc

# Update wrangler.jsonc
"vars": {
  "AUTH_ENABLED": "true"
}

# Redeploy
pnpm deploy:ingest
```

### Query API Authentication

Optional Bearer token authentication:

```bash
# Set the secret
wrangler secret put API_TOKEN --config workers/query-api/wrangler.jsonc

# Redeploy
pnpm deploy:query
```

Requests must include: `Authorization: Bearer <token>`

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

To use a custom domain for your workers:

1. Add the domain to your Cloudflare account
2. Update `wrangler.jsonc`:

```jsonc
{
  "routes": [
    {
      "pattern": "events.yourdomain.com/*",
      "custom_domain": true
    }
  ]
}
```
