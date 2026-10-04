# Getting Started with icelight

This guide walks you through setting up icelight from scratch.

## Prerequisites

1. **Cloudflare Account** on the Workers Paid plan (required for Basin Pipelines)
2. **Node.js 18+** and **pnpm 8+**
3. **Wrangler CLI** authenticated with your Cloudflare account (the repo pins wrangler `^4.147.0`; the `wrangler basin` commands need 4.145.0 or later)

```bash
# Login to Cloudflare
npx wrangler login
```

## Step 1: Clone and Install

```bash
git clone https://github.com/cliftonc/icelight.git
cd icelight
pnpm install
pnpm build
```

## Step 2: Create an API Token

`pnpm launch` asks for a Cloudflare API token and saves it to `.env` as `ICELIGHT_API_TOKEN`. Create one at [dash.cloudflare.com/profile/api-tokens](https://dash.cloudflare.com/profile/api-tokens) → **Create Token** → **Create Custom Token**, with these **Account** permissions:

- **Basin Catalog** → Edit
- **Basin SQL** → Read
- **Workers R2 Storage** → Edit
- **Workers Scripts** → Read

Set **Account Resources** to include your account. See [Cloudflare API Token Permissions](./configuration.md#cloudflare-api-token-permissions) for what each permission is used for. Don't use an R2 token from **R2 → Manage API tokens**; it lacks Workers Scripts.

See `templates/.env.example` for the other values `.env` can hold.

## Step 3: Launch

Run the setup script to create all Cloudflare resources and deploy the workers:

```bash
pnpm launch
```

This:
- Creates an R2 bucket with Basin Catalog enabled (`wrangler basin catalog enable`)
- Creates a Basin Pipelines stream with the event schema (`templates/schema.events.json`)
- Creates a sink that writes the Iceberg table `analytics.events` (60s roll interval)
- Creates a pipeline: `INSERT INTO <sink> SELECT * FROM <stream>`
- Creates a KV namespace (query cache) and D1 database (dashboards)
- Writes `wrangler.local.jsonc` for each worker and deploys them
- Offers to seed 30 days of demo events

The generated ingest config binds the stream:

```jsonc
{
  "pipelines": [
    {
      "binding": "PIPELINE",
      "stream": "<STREAM_ID>"
    }
  ]
}
```

The query config sets `WAREHOUSE_NAME` to the Basin Catalog warehouse (`<account-id>_<bucket>`) and the `CF_ACCOUNT_ID` / `CF_API_TOKEN` secrets.

You can re-run `pnpm launch` at any time; it detects existing resources and only creates what's missing.

## Step 4: Optional Authentication

If you want ingestion authentication:

```bash
wrangler secret put AUTH_TOKEN --config workers/event-ingest/wrangler.local.jsonc
```

And set `AUTH_ENABLED=true` in the wrangler config, then redeploy:

```bash
pnpm deploy:ingest
```

## Step 5: Redeploying

```bash
# Deploy ingestion worker
pnpm deploy:ingest

# Deploy query worker (builds the UI first)
pnpm deploy:query
```

## Step 6: Test the Setup

### Send a test event

```bash
curl -X POST https://icelight-event-ingest.your-subdomain.workers.dev/v1/track \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "test-user",
    "event": "Test Event",
    "properties": {
      "test": true
    }
  }'
```

### Query the data

Wait 1-2 minutes for the sink to roll the data into Iceberg, then:

```bash
curl -X POST https://icelight-query-api.your-subdomain.workers.dev/query \
  -H "Content-Type: application/json" \
  -d '{"sql": "SELECT * FROM analytics.events LIMIT 10"}'
```

### Load demo data

```bash
INGEST_API_URL=https://icelight-event-ingest.your-subdomain.workers.dev pnpm generate-events 30
```

## Next Steps

- [Configure an Analytics SDK](sdk-integration.md)
- [Learn about configuration options](configuration.md)
- [Query your data](querying.md)
