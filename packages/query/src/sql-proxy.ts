/**
 * R2 SQL API proxy
 * Proxies SQL queries to Cloudflare's R2 SQL API
 */

export interface R2SqlConfig {
  accountId: string;
  apiToken: string;
  warehouseName: string;
}

export interface R2SqlResult {
  success: boolean;
  data?: unknown[];
  meta?: {
    columns?: Array<{ name: string; type: string }>;
    rowCount?: number;
    executionTime?: number;
  };
  error?: string;
}

/**
 * Execute a SQL query against R2 SQL
 */
export async function executeQuery(
  sql: string,
  config: R2SqlConfig
): Promise<R2SqlResult> {
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/r2/catalogs/${config.warehouseName}/sql`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      let errorMessage = `R2 SQL API error: ${response.status}`;

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

    const result = await response.json() as {
      success: boolean;
      result?: {
        data?: unknown[];
        meta?: {
          columns?: Array<{ name: string; type: string }>;
          row_count?: number;
          execution_time_ms?: number;
        };
      };
      errors?: Array<{ message: string }>;
    };

    if (!result.success) {
      return {
        success: false,
        error: result.errors?.[0]?.message || 'Unknown error',
      };
    }

    return {
      success: true,
      data: result.result?.data || [],
      meta: {
        columns: result.result?.meta?.columns,
        rowCount: result.result?.meta?.row_count,
        executionTime: result.result?.meta?.execution_time_ms,
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
  config: R2SqlConfig
): Promise<R2SqlResult> {
  const sql = `SHOW TABLES IN ${namespace}`;
  return executeQuery(sql, config);
}

/**
 * Describe a table schema
 */
export async function describeTable(
  namespace: string,
  tableName: string,
  config: R2SqlConfig
): Promise<R2SqlResult> {
  const sql = `DESCRIBE ${namespace}.${tableName}`;
  return executeQuery(sql, config);
}
