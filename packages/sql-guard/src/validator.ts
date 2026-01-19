import { identify, type Result, type StatementType } from 'sql-query-identifier';

/**
 * Configuration options for SQL validation
 */
export interface SqlGuardConfig {
  /** Only allow SELECT statements (default: true) */
  selectOnly?: boolean;
  /** Maximum query length in bytes (default: 10000) */
  maxQueryLength?: number;
  /** Block dangerous DuckDB functions (default: true) */
  blockDangerousFunctions?: boolean;
  /** Maximum allowed LIMIT value (default: undefined = no limit) */
  maxLimit?: number;
  /** Require LIMIT for non-aggregated queries (default: false) */
  requireLimitForNonAggregated?: boolean;
}

/**
 * Result of SQL validation
 */
export interface ValidationResult {
  valid: boolean;
  errors: string[];
  statementType?: string;
  /** Detected LIMIT value, if present */
  limitValue?: number;
  /** Whether aggregation was detected */
  hasAggregation?: boolean;
}

/**
 * Default configuration values
 */
const DEFAULT_CONFIG: SqlGuardConfig = {
  selectOnly: true,
  maxQueryLength: 10000,
  blockDangerousFunctions: true,
  maxLimit: undefined,
  requireLimitForNonAggregated: false,
};

/**
 * Dangerous DuckDB functions that allow file I/O or system access
 */
const DANGEROUS_FUNCTIONS = [
  // File I/O functions
  'read_csv',
  'read_csv_auto',
  'read_json',
  'read_json_auto',
  'read_parquet',
  'read_blob',
  'write_csv',
  'write_parquet',
  'write_json',
  // System functions
  'copy',
  'export_database',
  'import_database',
  'load',
  'install',
  // Extension loading
  'load_extension',
  'install_extension',
];

/**
 * Check if a statement type is allowed (read operations only)
 * The library uses specific types like SHOW_TABLES, SHOW_COLUMNS, etc.
 */
function isAllowedStatementType(type: StatementType): boolean {
  // SELECT is exact match
  if (type === 'SELECT') return true;
  // SHOW_ prefixed statements are informational
  if (type.startsWith('SHOW_')) return true;
  return false;
}

/**
 * Validate a SQL query for security
 *
 * @param sql - The SQL query to validate
 * @param config - Optional configuration options
 * @returns Validation result with any errors
 */
export function validateSql(sql: string, config?: SqlGuardConfig): ValidationResult {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const errors: string[] = [];

  // Check for empty query
  if (!sql || sql.trim().length === 0) {
    return { valid: false, errors: ['SQL query is empty'] };
  }

  // Check query length
  if (cfg.maxQueryLength && sql.length > cfg.maxQueryLength) {
    return {
      valid: false,
      errors: [`Query exceeds maximum length of ${cfg.maxQueryLength} bytes`],
    };
  }

  // Parse the SQL to identify statement types
  let statements: Result[];
  try {
    statements = identify(sql, { dialect: 'psql', strict: false });
  } catch (err) {
    return {
      valid: false,
      errors: [`Failed to parse SQL: ${err instanceof Error ? err.message : String(err)}`],
    };
  }

  // Block multiple statements
  if (statements.length > 1) {
    return {
      valid: false,
      errors: ['Multiple statements are not allowed'],
    };
  }

  // Handle empty parse result
  if (statements.length === 0) {
    return {
      valid: false,
      errors: ['Unable to identify SQL statement type'],
    };
  }

  const stmt = statements[0];

  // Check statement type
  if (cfg.selectOnly && !isAllowedStatementType(stmt.type)) {
    errors.push(`${stmt.type} statements are not allowed. Only SELECT and SHOW statements are permitted.`);
  }

  // Check execution type (MODIFICATION includes INSERT, UPDATE, DELETE, etc.)
  if (stmt.executionType === 'MODIFICATION') {
    errors.push(`Write operations (${stmt.type}) are not allowed`);
  }

  // Check for dangerous functions
  if (cfg.blockDangerousFunctions) {
    const sqlLower = sql.toLowerCase();
    for (const func of DANGEROUS_FUNCTIONS) {
      // Match function calls (function name followed by parenthesis)
      const pattern = new RegExp(`\\b${func}\\s*\\(`, 'i');
      if (pattern.test(sqlLower)) {
        errors.push(`Function '${func}' is not allowed for security reasons`);
      }
    }
  }

  // Check LIMIT requirements
  let limitValue: number | undefined;
  let hasAggregation = false;

  if (cfg.requireLimitForNonAggregated || cfg.maxLimit !== undefined) {
    // Extract LIMIT value
    const limitMatch = sql.match(/\bLIMIT\s+(\d+)/i);
    limitValue = limitMatch ? parseInt(limitMatch[1], 10) : undefined;

    // Check for aggregation patterns
    const aggregationPatterns = [
      /\bCOUNT\s*\(/i,
      /\bSUM\s*\(/i,
      /\bAVG\s*\(/i,
      /\bMIN\s*\(/i,
      /\bMAX\s*\(/i,
      /\bARRAY_AGG\s*\(/i,
      /\bSTRING_AGG\s*\(/i,
      /\bGROUP_CONCAT\s*\(/i,
      /\bGROUP\s+BY\b/i,
    ];
    hasAggregation = aggregationPatterns.some((p) => p.test(sql));

    // Require LIMIT for non-aggregated queries
    if (cfg.requireLimitForNonAggregated && !hasAggregation && limitValue === undefined) {
      errors.push('Non-aggregated queries must include a LIMIT clause');
    }

    // Check max LIMIT
    if (cfg.maxLimit !== undefined && limitValue !== undefined && limitValue > cfg.maxLimit) {
      errors.push(`LIMIT ${limitValue} exceeds maximum allowed (${cfg.maxLimit})`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    statementType: stmt.type,
    limitValue,
    hasAggregation,
  };
}

/**
 * Check if a SQL query is a safe read-only query
 *
 * @param sql - The SQL query to check
 * @returns true if the query is safe to execute
 */
export function isReadOnlyQuery(sql: string): boolean {
  const result = validateSql(sql, { selectOnly: true });
  return result.valid;
}
