# event-ingest Worker

Cloudflare Worker for analytics event ingestion.

## Purpose

Deployable worker that receives analytics events from SDKs (RudderStack, Segment, custom) and forwards them to a Basin Pipelines stream for storage in Iceberg tables (Basin Catalog).

## Architecture

```
SDK/Client → event-ingest Worker → Basin Pipelines stream → sink → R2 Iceberg (Basin Catalog)
```

## Files

| File | Description |
|------|-------------|
| `src/index.ts` | Worker entry point |
| `src/handler.ts` | Hono app factory and route handlers |
| `src/auth.ts` | Authentication middleware |
| `src/batch.ts` | Event batch processing logic |
| `wrangler.jsonc` | Wrangler configuration |
| `package.json` | Dependencies |
| `tsconfig.json` | TypeScript config |

## Entry Point

```typescript
// src/index.ts
import { createIngestApp } from './handler.js';
export default createIngestApp();
```

This worker is self-contained with all ingestion logic in the `src/` directory.

## Configuration

### wrangler.jsonc

```jsonc
{
  "name": "icelight-event-ingest",
  "main": "src/index.ts",
  // 2025-01-01 or later is required for the Basin Pipelines send() method
  "compatibility_date": "2026-10-01",
  "compatibility_flags": ["nodejs_compat"],

  "vars": {
    "AUTH_ENABLED": "false"
  },

  // Added to wrangler.local.jsonc by pnpm launch (stream ID, not pipeline ID).
  // The older `pipeline` field is deprecated in favour of `stream`.
  "pipelines": [
    {
      "binding": "PIPELINE",
      "stream": "<STREAM_ID>"
    }
  ]
}
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PIPELINE` | Yes | Basin Pipelines stream binding (configured in wrangler.local.jsonc) |
| `AUTH_ENABLED` | No | Set to "true" to require authentication |
| `AUTH_TOKEN` | If auth enabled | Secret token (set via `wrangler secret`) |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins (default: "*") |

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/v1/batch` | Batch events (primary endpoint) |
| POST | `/v1/track` | Single track event |
| POST | `/v1/identify` | Single identify event |
| POST | `/v1/page` | Single page event |
| POST | `/v1/screen` | Single screen event |
| POST | `/v1/group` | Single group event |
| POST | `/v1/alias` | Single alias event |
| GET | `/health` | Health check |

## Development

```bash
# Run locally
pnpm dev

# Type check
pnpm typecheck

# Deploy
pnpm deploy
```

## Setup Steps

1. **Create Basin infrastructure** (stream, sink, pipeline) and `wrangler.local.jsonc`:
   ```bash
   pnpm launch  # From root
   ```

2. **Check the stream binding** in `wrangler.local.jsonc` (`wrangler basin pipelines streams list` shows the stream ID)

3. **Set secrets** (if using auth):
   ```bash
   wrangler secret put AUTH_TOKEN
   ```

4. **Deploy**:
   ```bash
   pnpm deploy
   ```

## Testing Locally

```bash
# Start dev server
pnpm dev

# Send test event
curl -X POST http://localhost:8787/v1/track \
  -H "Content-Type: application/json" \
  -d '{"userId": "test", "event": "Test Event"}'

# Send batch
curl -X POST http://localhost:8787/v1/batch \
  -H "Content-Type: application/json" \
  -d '{"batch": [{"type": "track", "userId": "test", "event": "Test"}]}'
```

Note: The Basin Pipelines binding won't work locally unless using the `--remote` flag.

## SDK Compatibility

Compatible with:
- RudderStack JavaScript SDK
- Segment Analytics.js
- Any SDK using the Segment HTTP API format

Configure SDK to point to this worker's URL as the data plane.

## Notes

- Worker URL pattern: `https://icelight-event-ingest.<subdomain>.workers.dev`
- Events are validated and flattened (`FlattenedEvent`) before `PIPELINE.send()`
- Invalid events return 400 with error details
- The stream must exist before deploying (run `pnpm launch` first); events that don't match the stream schema are accepted at ingest but dropped by the pipeline
