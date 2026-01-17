import { Hono, Context } from 'hono';
import { cors } from 'hono/cors';
import { bearerAuth } from 'hono/bearer-auth';
import { executeQuery, listTables, describeTable, type R2SqlConfig } from './sql-proxy.js';
import { formatResult, type OutputFormat } from './formatter.js';

export interface QueryEnv {
  CF_ACCOUNT_ID: string;
  CF_API_TOKEN: string;
  WAREHOUSE_NAME: string;
  API_TOKEN?: string; // Optional: require API token for query requests
  ALLOWED_ORIGINS?: string;
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
  };
  error?: string;
}

type QueryContext = Context<{ Bindings: QueryEnv }>;

/**
 * Get R2 SQL config from environment
 */
function getR2Config(env: QueryEnv): R2SqlConfig {
  return {
    accountId: env.CF_ACCOUNT_ID,
    apiToken: env.CF_API_TOKEN,
    warehouseName: env.WAREHOUSE_NAME,
  };
}

/**
 * Create the Hono app for query API
 */
export function createQueryApp() {
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

  const config = getR2Config(c.env);
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
  const config = getR2Config(c.env);
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
  const config = getR2Config(c.env);
  const result = await describeTable(namespace, table, config);

  return c.json(result satisfies QueryResponse, result.success ? 200 : 400);
}

/**
 * Default export for direct use as a Worker
 */
export default createQueryApp();
