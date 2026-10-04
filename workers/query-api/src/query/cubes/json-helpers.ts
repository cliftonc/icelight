/**
 * JSON extraction helpers for Drizzle Cube
 *
 * Builds SQL expressions for extracting fields from JSON columns
 * using Basin SQL's JSON functions (json_get_str, json_get_float, ...).
 */

import { sql, type SQL } from 'drizzle-orm';
import { events } from '../schema/events.js';
import type { JsonFieldConfig } from './json-config.js';

type JsonColumn = 'properties' | 'traits' | 'context';

/**
 * Convert a JSONPath like '$.geo.region' or '$.items[0].sku' into the
 * key/index arguments Basin SQL's json_get_* functions expect.
 */
export function jsonPathToKeys(path: string): Array<string | number> {
  const keys: Array<string | number> = [];
  const trimmed = path.replace(/^\$\.?/, '');
  const pattern = /([^.[\]]+)|\[(\d+)\]|\[['"]([^'"]+)['"]\]/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(trimmed)) !== null) {
    if (match[1] !== undefined) keys.push(match[1]);
    else if (match[2] !== undefined) keys.push(parseInt(match[2], 10));
    else if (match[3] !== undefined) keys.push(match[3]);
  }

  return keys;
}

/**
 * Build a SQL expression for extracting a JSON field using Basin SQL syntax
 *
 * Note: Keys are inlined as literals using sql.raw() rather than being
 * parameterized, so the generated SQL stays readable and cacheable.
 */
export function jsonExtract(
  column: JsonColumn,
  path: string,
  type: 'string' | 'number' | 'boolean' = 'string'
): SQL {
  const col = events[column];
  const keys = jsonPathToKeys(path)
    .map((key) => (typeof key === 'number' ? String(key) : `'${key.replace(/'/g, "''")}'`))
    .join(', ');
  const keyArgs = sql.raw(keys);

  switch (type) {
    case 'number':
      return sql<number>`json_get_float(${col}, ${keyArgs})`;
    case 'boolean':
      return sql<boolean>`json_get_bool(${col}, ${keyArgs})`;
    case 'string':
    default:
      return sql<string>`json_get_str(${col}, ${keyArgs})`;
  }
}

/**
 * Dimension definition type for Drizzle Cube
 */
export interface JsonDimension {
  name: string;
  title: string;
  type: 'string' | 'number' | 'boolean';
  sql: SQL;
  shown?: boolean;
}

/**
 * Build dimension definition from JSON field config
 */
export function buildJsonDimension(
  column: JsonColumn,
  config: JsonFieldConfig
): JsonDimension {
  return {
    name: config.name,
    title: config.title ?? config.name,
    type: config.type,
    sql: jsonExtract(column, config.path, config.type),
    shown: config.shown ?? true,
  };
}

/**
 * Build all JSON dimensions for a column from config array
 */
export function buildJsonDimensions(
  column: JsonColumn,
  configs: JsonFieldConfig[]
): Record<string, JsonDimension> {
  const dimensions: Record<string, JsonDimension> = {};

  for (const config of configs) {
    dimensions[config.name] = buildJsonDimension(column, config);
  }

  return dimensions;
}
