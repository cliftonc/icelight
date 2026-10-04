/**
 * Basin SQL API client
 * Executes SQL queries against Cloudflare Basin SQL (formerly R2 SQL)
 */

import { validateNamespace, validateIdentifier } from '@icelight/sql-guard';

export interface BasinSqlConfig {
  accountId: string;
  apiToken: string;
  warehouseName: string; // Basin Catalog warehouse: <account-id>_<bucket-name>
}

export interface BasinSqlMetrics {
  bytesScanned?: number;
  filesScanned?: number;
}

export interface BasinSqlResult {
  success: boolean;
  data?: Record<string, unknown>[];
  meta?: {
    columns?: Array<{ name: string; type: string }>;
    rowCount?: number;
    executionTime?: number;
    metrics?: BasinSqlMetrics;
  };
  error?: string;
}

/**
 * Schema column as returned by Basin SQL.
 * Older R2 SQL responses nested the type under `descriptor.type.name`.
 */
interface BasinSqlSchemaColumn {
  name: string;
  type?: string | { name?: string };
  descriptor?: { type?: { name?: string } };
}

interface BasinSqlApiResponse {
  success: boolean;
  result?: {
    rows?: Record<string, unknown>[];
    schema?: BasinSqlSchemaColumn[];
    metrics?: {
      bytes_scanned?: number;
      files_scanned?: number;
    };
  };
  errors?: Array<{ code?: number; message: string }>;
}

/**
 * Extract the bucket name from a warehouse name (<account-id>_<bucket-name>)
 */
export function bucketFromWarehouse(warehouseName: string): string {
  const splitIndex = warehouseName.indexOf('_');
  return splitIndex === -1 ? warehouseName : warehouseName.slice(splitIndex + 1);
}

/**
 * Normalise a schema column type across Basin SQL / legacy R2 SQL response shapes
 */
export function columnType(col: BasinSqlSchemaColumn): string {
  if (typeof col.type === 'string') return col.type;
  if (col.type?.name) return col.type.name;
  return col.descriptor?.type?.name || 'unknown';
}

/**
 * Execute a SQL query against Basin SQL
 */
export async function executeQuery(
  sql: string,
  config: BasinSqlConfig
): Promise<BasinSqlResult> {
  const bucketName = bucketFromWarehouse(config.warehouseName);
  // Accept a bare bucket name too (bucket names cannot contain underscores)
  const warehouse = config.warehouseName.includes('_')
    ? config.warehouseName
    : `${config.accountId}_${config.warehouseName}`;
  const url = `https://api.sql.cloudflarestorage.com/api/v1/accounts/${config.accountId}/basin-sql/query/${bucketName}`;
  const start = Date.now();

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ warehouse, query: sql }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `Basin SQL API error: ${response.status}`;

      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.errors?.[0]?.message) {
          errorMessage = errorJson.errors[0].message;
        }
      } catch {
        if (errorBody) {
          errorMessage = errorBody;
        }
      }

      return { success: false, error: errorMessage };
    }

    const result = await response.json() as BasinSqlApiResponse;

    if (!result.success) {
      return {
        success: false,
        error: result.errors?.[0]?.message || 'Unknown error',
      };
    }

    const columns = result.result?.schema?.map(col => ({
      name: col.name,
      type: columnType(col),
    }));
    const rows = result.result?.rows || [];

    return {
      success: true,
      data: rows,
      meta: {
        columns,
        rowCount: rows.length,
        executionTime: Date.now() - start,
        metrics: {
          bytesScanned: result.result?.metrics?.bytes_scanned,
          filesScanned: result.result?.metrics?.files_scanned,
        },
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to execute query',
    };
  }
}

/**
 * List tables in a namespace
 */
export async function listTables(
  namespace: string,
  config: BasinSqlConfig
): Promise<BasinSqlResult> {
  const validation = validateNamespace(namespace);
  if (!validation.valid) {
    return { success: false, error: `Invalid namespace: ${validation.error}` };
  }
  const sql = `SHOW TABLES IN ${validation.sanitized}`;
  return executeQuery(sql, config);
}

/**
 * Describe a table schema
 */
export async function describeTable(
  namespace: string,
  tableName: string,
  config: BasinSqlConfig
): Promise<BasinSqlResult> {
  const nsValidation = validateNamespace(namespace);
  if (!nsValidation.valid) {
    return { success: false, error: `Invalid namespace: ${nsValidation.error}` };
  }
  const tableValidation = validateIdentifier(tableName);
  if (!tableValidation.valid) {
    return { success: false, error: `Invalid table name: ${tableValidation.error}` };
  }
  const sql = `DESCRIBE ${nsValidation.sanitized}.${tableValidation.sanitized}`;
  return executeQuery(sql, config);
}
