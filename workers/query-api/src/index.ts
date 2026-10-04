import { Hono } from 'hono';
import { createQueryApp, createEventsCube } from './query/index.js';
import type { QueryEnv } from './query/index.js';
import { cubeConfig } from './cube-config.js';
import { CloudflareKVProvider } from './cache/cloudflare-kv-provider.js';
import { createDashboardRoutes } from './dashboards/routes.js';
import { handleScheduled, type CronEnv } from './cron/handler.js';
import { apiAuth, rateLimit } from './query/protection.js';

// Create cube with custom configuration
const eventsCube = createEventsCube(cubeConfig);

// Create the query app with cube configuration
// The app handles query endpoints:
// - POST /query - Execute SQL query (body: { sql: string, format?: 'json' | 'csv' })
// - GET /tables/:namespace - List tables in a namespace
// - GET /tables/:namespace/:table - Describe a table schema
// - GET /health - Health check
// - /cubejs-api/* - Drizzle Cube semantic API (with JSON field extraction)
//
// Configuration (set via secrets/vars):
// - CF_ACCOUNT_ID: Cloudflare account ID
// - CF_API_TOKEN: Cloudflare API token with R2 SQL permissions
// - WAREHOUSE_NAME: R2 SQL warehouse name
// - API_TOKEN: (optional) Bearer token to require for API access
// - ALLOWED_ORIGINS: (optional) Comma-separated list of allowed CORS origins
// - CACHE: (optional) KV namespace binding for drizzle-cube query caching
// - DB: (optional) D1 database binding for dashboard storage
// - RATE_LIMITER: (optional) per-IP rate limit binding for query/semantic/MCP/dashboard routes
// - PUBLIC_DEMO / INGEST_AUTH_TOKEN / DEMO_INGEST_RATE_LIMITER: (optional) anonymous demo ingest via /v1/*

const queryApp = createQueryApp({
  cubes: [eventsCube],
  cache: {
    providerFactory: (kv) => new CloudflareKVProvider(kv),
    defaultTtlMs: 3600000, // 60 minutes
    keyPrefix: 'drizzle-cube:',
    includeSecurityContext: true,
  },
});

// Create the main app and mount sub-apps
const app = new Hono<{ Bindings: QueryEnv }>();

// Public: tells the UI whether it needs to ask for an API token
app.get('/api/config', (c) =>
  c.json({ authRequired: !!c.env.API_TOKEN, publicDemo: c.env.PUBLIC_DEMO === 'true' })
);

// Mount dashboard routes at /api/dashboards, behind the same auth and rate limit as the query API
for (const path of ['/api/dashboards', '/api/dashboards/*']) {
  app.use(path, apiAuth(), rateLimit<QueryEnv>((env) => env.RATE_LIMITER));
}
app.route('/api/dashboards', createDashboardRoutes());

// Mount the query app for all other routes
app.route('/', queryApp);

// Export as a Cloudflare Worker with both fetch and scheduled handlers
export default {
  fetch: app.fetch,
  scheduled: handleScheduled,
} satisfies ExportedHandler<QueryEnv & CronEnv>;
