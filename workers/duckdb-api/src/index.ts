/**
 * DuckDB API Worker
 *
 * This worker manages a DuckDB Container and proxies requests to it.
 * The container runs DuckDB with Iceberg extension configured to access
 * R2 Data Catalog for querying analytics events.
 *
 * Architecture:
 * Client (HTTP) → Worker → DurableObject (PkgContainer) → Container (DuckDB) → R2 Data Catalog
 *
 * Environment variables:
 * - R2_TOKEN: Cloudflare API token with R2 + Data Catalog permissions
 * - R2_ENDPOINT: R2 catalog URI
 * - R2_CATALOG: Warehouse name (e.g., cdpflare-data)
 * - API_TOKEN: (optional) Bearer token for API auth
 */

import { Container as PkgContainer } from '@cloudflare/containers';
import { Hono, type Context, type Next } from 'hono';
import { cors } from 'hono/cors';

/**
 * Environment bindings
 */
interface Env {
  // Durable Object namespace for container management
  CONTAINER: DurableObjectNamespace;

  // R2 Data Catalog configuration
  R2_TOKEN: string;
  R2_ENDPOINT: string;
  R2_CATALOG: string;

  // Optional API authentication
  API_TOKEN?: string;

  // Optional CORS origins
  ALLOWED_ORIGINS?: string;
}

/**
 * DuckDB Container Durable Object
 *
 * Extends PkgContainer from @cloudflare/containers to handle container lifecycle
 * and request proxying automatically.
 */
export class DuckDBContainer extends PkgContainer<Env> {
  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);

    const envConfig: Record<string, string> = {};

    // Add R2 Data Catalog credentials for Iceberg to work
    if (env.R2_TOKEN) {
      envConfig.R2_TOKEN = env.R2_TOKEN;
    }
    if (env.R2_ENDPOINT) {
      envConfig.R2_ENDPOINT = env.R2_ENDPOINT;
    }
    if (env.R2_CATALOG) {
      envConfig.R2_CATALOG = env.R2_CATALOG;
    }

    // Configure container settings
    this.defaultPort = 3000;
    this.sleepAfter = '3m';
    this.enableInternet = true;
    this.envVars = envConfig;
  }
}

// Create Hono app for the worker
const app = new Hono<{ Bindings: Env }>();

// CORS middleware
app.use('*', async (c: Context<{ Bindings: Env }>, next: Next) => {
  const allowedOrigins = c.env.ALLOWED_ORIGINS?.split(',').map((o: string) => o.trim()) || ['*'];

  return cors({
    origin: allowedOrigins.includes('*') ? '*' : allowedOrigins,
    allowMethods: ['GET', 'POST', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  })(c, next);
});

// Optional authentication middleware
app.use('*', async (c: Context<{ Bindings: Env }>, next: Next) => {
  // Skip auth for health check
  if (c.req.path === '/_health' || c.req.path === '/') {
    return next();
  }

  // Check if auth is required
  const apiToken = c.env.API_TOKEN;
  if (!apiToken) {
    return next();
  }

  // Validate Bearer token
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);
  if (token !== apiToken) {
    return c.json({ success: false, error: 'Invalid API token' }, 401);
  }

  return next();
});

// Health check (doesn't require container)
app.get('/_health', (c: Context<{ Bindings: Env }>) => {
  return c.json({
    status: 'ok',
    service: 'cdpflare-duckdb-api',
    timestamp: new Date().toISOString(),
  });
});

// Welcome endpoint
app.get('/', (c: Context<{ Bindings: Env }>) => {
  return c.json({
    name: 'cdpflare-duckdb-api',
    version: '0.1.0',
    description: 'DuckDB-powered query API for R2 Data Catalog',
    endpoints: {
      '/': 'This welcome message',
      '/_health': 'Health check',
      '/query': 'POST - Execute SQL query',
      '/streaming-query': 'POST - Execute SQL query with streaming response',
    },
    usage: {
      query: 'POST /query with body: { "query": "SELECT ..." }',
      catalog: 'R2 catalog available as: r2_datalake',
      example: 'SELECT * FROM r2_datalake.analytics.events LIMIT 10',
    },
    advantages: [
      'Full DuckDB SQL support (JOINs, aggregations, window functions)',
      'Queries R2 Data Catalog Iceberg tables',
      'Streaming support for large result sets',
    ],
  });
});

// Forward all other requests to the container
app.all('*', async (c: Context<{ Bindings: Env }>) => {
  try {
    // Forward request to container
    return await c.env.CONTAINER.get(c.env.CONTAINER.idFromName('cdpflare-duckdb')).fetch(c.req.raw);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Worker error:', errorMessage);

    return c.json({ success: false, error: errorMessage }, 500);
  }
});

// Export Durable Object class and default handler
export default app;
