import { Hono, Context } from 'hono';
import { cors } from 'hono/cors';
import { bearerAuth } from 'hono/bearer-auth';
import { executeQuery, listTables, describeTable, type BasinSqlConfig, type BasinSqlMetrics } from './basin-sql.js';
import { createBasinDrizzle } from './basin-drizzle.js';
import { formatResult, type OutputFormat } from './formatter.js';
import { validateSql } from '@icelight/sql-guard';
import { events } from './schema/events.js';
import { createCubeApp } from 'drizzle-cube/adapters/hono';
import { allCubes } from './cubes/events.js';
import { SemanticLayerCompiler, type Cube, type CacheConfig, type CacheProvider } from 'drizzle-cube/server';

/**
 * Factory function to create a cache provider from KV binding
 */
export type CacheProviderFactory = (kv: KVNamespace) => CacheProvider;

export interface QueryEnv {
  CF_ACCOUNT_ID: string;
  CF_API_TOKEN: string;
  WAREHOUSE_NAME: string; // Basin Catalog warehouse: <account-id>_<bucket-name>
  API_TOKEN?: string; // Optional: require API token for query requests
  ALLOWED_ORIGINS?: string;
  // Ingest API configuration (for proxying /v1/* routes)
  INGEST_API?: Fetcher; // Service Binding to ingest worker (preferred)
  INGEST_API_URL?: string; // URL to the event ingest worker (fallback)
  // Cache configuration
  CACHE?: KVNamespace; // KV binding for drizzle-cube query result caching
  // D1 database for dashboard storage
  DB?: D1Database; // D1 binding for dashboard configuration storage
}

export interface QueryRequest {
  sql: string;
  format?: OutputFormat;
}

export interface QueryResponse {
  success: boolean;
  data?: unknown[];
  meta?: {
    columns?: Array<{ name: string; type: string }>;
    rowCount?: number;
    executionTime?: number;
    metrics?: BasinSqlMetrics;
  };
  error?: string;
}

type QueryContext = Context<{ Bindings: QueryEnv }>;

/**
 * Cache options for drizzle-cube query results
 */
export interface CacheOptions {
  /** Factory function to create a cache provider from KV binding */
  providerFactory: CacheProviderFactory;
  /** Default TTL in milliseconds (default: 3600000 = 60 minutes) */
  defaultTtlMs?: number;
  /** Key prefix for cache entries (default: 'drizzle-cube:') */
  keyPrefix?: string;
  /** Include security context in cache key (default: true) */
  includeSecurityContext?: boolean;
}

/**
 * Options for creating the query app
 */
export interface QueryAppOptions {
  /** Custom cube definitions (defaults to allCubes from events.ts) */
  cubes?: Cube[];
  /** Cache options for drizzle-cube query results (requires CACHE KV binding in env) */
  cache?: CacheOptions;
}

/**
 * Get Basin SQL config from environment
 */
function getBasinConfig(env: QueryEnv): BasinSqlConfig {
  return {
    accountId: env.CF_ACCOUNT_ID,
    apiToken: env.CF_API_TOKEN,
    warehouseName: env.WAREHOUSE_NAME,
  };
}

/**
 * Create the Hono app for query API
 */
export function createQueryApp(options: QueryAppOptions = {}) {
  const cubes = options.cubes ?? allCubes;
  const app = new Hono<{ Bindings: QueryEnv }>();

  // CORS middleware
  app.use('*', async (c, next) => {
    const origins = c.env.ALLOWED_ORIGINS?.split(',').map((o: string) => o.trim()) || ['*'];
    const corsMiddleware = cors({
      origin: origins.includes('*') ? '*' : origins,
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400,
    });
    return corsMiddleware(c, next);
  });

  // Optional auth middleware - only apply if API_TOKEN is set
  app.use('*', async (c, next) => {
    if (c.env.API_TOKEN) {
      const authMiddleware = bearerAuth({ token: c.env.API_TOKEN });
      return authMiddleware(c, next);
    }
    await next();
  });

  // Health check
  app.get('/health', (c) => c.json({ status: 'ok' }));

  // Execute SQL query
  app.post('/query', async (c) => {
    return handleQuery(c);
  });

  // List tables in a namespace
  app.get('/tables/:namespace', async (c) => {
    return handleListTables(c);
  });

  // Describe a table
  app.get('/tables/:namespace/:table', async (c) => {
    return handleDescribeTable(c);
  });

  // Proxy /v1/* routes to the ingest API
  app.all('/v1/*', async (c) => {
    return handleIngestProxy(c);
  });

  // Mount cube API routes
  app.all('/cubejs-api/*', async (c) => {
    // Build cache config at runtime if KV binding is available
    let cacheConfig: CacheConfig | undefined;
    if (options.cache && c.env.CACHE) {
      cacheConfig = {
        provider: options.cache.providerFactory(c.env.CACHE),
        defaultTtlMs: options.cache.defaultTtlMs ?? 3600000,
        keyPrefix: options.cache.keyPrefix ?? 'drizzle-cube:',
        includeSecurityContext: options.cache.includeSecurityContext ?? true,
        onError: (error, operation) => {
          console.error(`[Cache Error] ${operation}: ${error.message}`);
        },
      };
    }
    return handleCubeRequest(c, cubes, cacheConfig);
  });

  return app;
}

/**
 * Handle SQL query request
 */
async function handleQuery(c: QueryContext) {
  // Validate config
  if (!c.env.CF_ACCOUNT_ID || !c.env.CF_API_TOKEN || !c.env.WAREHOUSE_NAME) {
    return c.json(
      { success: false, error: 'Missing required configuration: CF_ACCOUNT_ID, CF_API_TOKEN, WAREHOUSE_NAME' } satisfies QueryResponse,
      500
    );
  }

  let body: QueryRequest;
  try {
    body = await c.req.json<QueryRequest>();
  } catch {
    return c.json(
      { success: false, error: 'Invalid JSON body' } satisfies QueryResponse,
      400
    );
  }

  if (!body.sql || typeof body.sql !== 'string') {
    return c.json(
      { success: false, error: 'Missing or invalid sql field' } satisfies QueryResponse,
      400
    );
  }

  // Validate SQL for security
  const validation = validateSql(body.sql, {
    selectOnly: true,
    maxQueryLength: 50000,
    requireLimitForNonAggregated: true,
    maxLimit: 10000,
  });
  if (!validation.valid) {
    return c.json(
      { success: false, error: `SQL validation failed: ${validation.errors.join('; ')}` } satisfies QueryResponse,
      400
    );
  }

  const config = getBasinConfig(c.env);
  const result = await executeQuery(body.sql, config);

  const format = body.format || 'json';
  const formatted = formatResult(result, format);

  return new Response(formatted.body, {
    status: result.success ? 200 : 400,
    headers: {
      'Content-Type': formatted.contentType,
    },
  });
}

/**
 * Handle list tables request
 */
async function handleListTables(c: QueryContext) {
  if (!c.env.CF_ACCOUNT_ID || !c.env.CF_API_TOKEN || !c.env.WAREHOUSE_NAME) {
    return c.json(
      { success: false, error: 'Missing required configuration' } satisfies QueryResponse,
      500
    );
  }

  const namespace = c.req.param('namespace');
  const config = getBasinConfig(c.env);
  const result = await listTables(namespace, config);

  return c.json(result satisfies QueryResponse, result.success ? 200 : 400);
}

/**
 * Handle describe table request
 */
async function handleDescribeTable(c: QueryContext) {
  if (!c.env.CF_ACCOUNT_ID || !c.env.CF_API_TOKEN || !c.env.WAREHOUSE_NAME) {
    return c.json(
      { success: false, error: 'Missing required configuration' } satisfies QueryResponse,
      500
    );
  }

  const namespace = c.req.param('namespace');
  const table = c.req.param('table');
  const config = getBasinConfig(c.env);
  const result = await describeTable(namespace, table, config);

  return c.json(result satisfies QueryResponse, result.success ? 200 : 400);
}

/**
 * Handle ingest API proxy request
 * Forwards /v1/* requests to the configured INGEST_API (binding) or INGEST_API_URL
 */
async function handleIngestProxy(c: QueryContext) {
  if (!c.env.INGEST_API && !c.env.INGEST_API_URL) {
    return c.json(
      { success: false, error: 'Ingest API not configured: INGEST_API (binding) or INGEST_API_URL is required' },
      500
    );
  }

  // Build the target URL - preserve the path after /v1
  const path = c.req.path; // e.g., /v1/track, /v1/batch
  const useServiceBinding = !!c.env.INGEST_API;

  // Service bindings need a valid URL (host is ignored, only path matters)
  // External fetch needs the actual worker URL
  const targetUrl = useServiceBinding
    ? `https://ingest-api${path}`
    : new URL(path, c.env.INGEST_API_URL).toString();

  // Copy query parameters for external URLs
  if (!useServiceBinding) {
    const url = new URL(c.req.url);
    const fullUrl = new URL(targetUrl);
    fullUrl.search = url.search;
  }

  // Forward the request
  const headers = new Headers(c.req.raw.headers);
  // Remove host header to avoid issues
  headers.delete('host');

  // Use service binding fetch or global fetch
  const fetchFn = useServiceBinding ? c.env.INGEST_API!.fetch.bind(c.env.INGEST_API) : fetch;

  try {
    const response = await fetchFn(targetUrl, {
      method: c.req.method,
      headers,
      body: c.req.method !== 'GET' && c.req.method !== 'HEAD' ? c.req.raw.body : undefined,
    });

    // Return the response from the ingest API
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return c.json(
      { success: false, error: `Ingest proxy error: ${errorMessage}` },
      502
    );
  }
}

/**
 * Handle cube API request (via drizzle-cube on Basin SQL)
 */
async function handleCubeRequest(c: QueryContext, cubes: Cube[], cacheConfig?: CacheConfig) {
  if (!c.env.CF_ACCOUNT_ID || !c.env.CF_API_TOKEN || !c.env.WAREHOUSE_NAME) {
    return c.json({ error: 'Missing required configuration: CF_ACCOUNT_ID, CF_API_TOKEN, WAREHOUSE_NAME' }, 500);
  }

  const schema = { events };
  const db = createBasinDrizzle(getBasinConfig(c.env), schema);

  // Basin SQL is close to the Postgres dialect, so use drizzle-cube's postgres adapter
  const semanticLayer = new SemanticLayerCompiler({
    drizzle: db,
    schema,
    engineType: 'postgres',
    cache: cacheConfig,
  });
  for (const cube of cubes) {
    semanticLayer.registerCube(cube);
  }

  const cubeApp = createCubeApp({
    semanticLayer,
    extractSecurityContext: async () => ({}),
  });

  // Forward request to cube app
  return cubeApp.fetch(c.req.raw, c.env, c.executionCtx);
}

/**
 * Default export for direct use as a Worker
 */
export default createQueryApp();
