/**
 * Drizzle driver for Basin SQL
 *
 * Uses drizzle's pg-proxy driver so drizzle-cube can build and execute
 * Postgres-dialect queries, which are sent to Basin SQL over HTTP.
 *
 * Basin SQL does not support bound parameters, so parameters are inlined
 * as escaped SQL literals before the query is sent.
 */

import { drizzle } from 'drizzle-orm/pg-proxy';
import { executeQuery, type BasinSqlConfig } from './basin-sql.js';

/**
 * Format a single parameter value as a SQL literal
 */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL';
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? String(value) : 'NULL';
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'boolean') {
    return value ? 'TRUE' : 'FALSE';
  }
  if (value instanceof Date) {
    return `TIMESTAMP '${value.toISOString()}'`;
  }
  if (Array.isArray(value)) {
    return `make_array(${value.map(formatValue).join(', ')})`;
  }
  if (typeof value === 'object') {
    return quoteString(JSON.stringify(value));
  }
  return quoteString(String(value));
}

function quoteString(value: string): string {
  return `'${value.replace(/'/g, "''")}'`;
}

/**
 * Replace positional parameters ($1, $2, ...) with SQL literals.
 *
 * Placeholders inside quoted strings or identifiers are left untouched, and
 * $1 is never matched as a prefix of $10.
 */
export function inlineParams(query: string, params: unknown[]): string {
  if (params.length === 0) {
    return query;
  }

  let result = '';
  let quote: "'" | '"' | null = null;

  for (let i = 0; i < query.length; i++) {
    const char = query[i];

    if (quote) {
      result += char;
      if (char === quote) {
        // Doubled quote is an escaped quote, not the end of the string
        if (query[i + 1] === quote) {
          result += query[++i];
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (char === "'" || char === '"') {
      quote = char;
      result += char;
      continue;
    }

    if (char === '$') {
      const match = /^\$(\d+)/.exec(query.slice(i));
      if (match) {
        const index = parseInt(match[1], 10) - 1;
        if (index < 0 || index >= params.length) {
          throw new Error(`Missing value for SQL parameter $${index + 1}`);
        }
        result += formatValue(params[index]);
        i += match[0].length - 1;
        continue;
      }
    }

    result += char;
  }

  return result;
}

export interface BasinQuery {
  sql: string;
  /** Rows to drop from the start of the result (emulated OFFSET) */
  skipRows: number;
}

/**
 * Rewrite Postgres-dialect SQL constructs that Basin SQL does not accept.
 *
 * Basin SQL has no OFFSET, so a trailing `LIMIT n OFFSET m` becomes
 * `LIMIT n+m` and the first m rows are dropped after the query returns.
 */
export function rewriteForBasin(query: string): BasinQuery {
  const limitOffset = /\slimit\s+(\d+)\s+offset\s+(\d+)\s*$/i.exec(query);
  if (limitOffset) {
    const limit = parseInt(limitOffset[1], 10);
    const offset = parseInt(limitOffset[2], 10);
    return {
      sql: `${query.slice(0, limitOffset.index)} limit ${limit + offset}`,
      skipRows: offset,
    };
  }

  const offsetOnly = /\soffset\s+(\d+)\s*$/i.exec(query);
  if (offsetOnly) {
    return {
      sql: query.slice(0, offsetOnly.index),
      skipRows: parseInt(offsetOnly[1], 10),
    };
  }

  return { sql: query, skipRows: 0 };
}

/**
 * Convert object rows to positional arrays in schema column order,
 * as expected by drizzle's pg-proxy driver for typed (non-raw) queries
 */
export function rowsToArrays(
  rows: Record<string, unknown>[],
  columns: string[]
): unknown[][] {
  return rows.map((row) => columns.map((column) => row[column]));
}

/**
 * Create a drizzle database instance backed by Basin SQL
 */
export function createBasinDrizzle<TSchema extends Record<string, unknown>>(
  config: BasinSqlConfig,
  schema: TSchema
) {
  return drizzle(
    async (query, params, method) => {
      const basinQuery = rewriteForBasin(inlineParams(query, params));
      const result = await executeQuery(basinQuery.sql, config);

      if (!result.success) {
        throw new Error(result.error ?? 'Basin SQL query failed');
      }

      const rows = (result.data ?? []).slice(basinQuery.skipRows);
      if (method === 'all') {
        const columns = result.meta?.columns?.map((c) => c.name) ?? Object.keys(rows[0] ?? {});
        return { rows: rowsToArrays(rows, columns) };
      }
      return { rows };
    },
    { schema }
  );
}
