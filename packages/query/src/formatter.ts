import type { R2SqlResult } from './sql-proxy.js';

export type OutputFormat = 'json' | 'csv';

export interface FormattedResult {
  contentType: string;
  body: string;
}

/**
 * Format query results as JSON
 */
function formatJson(result: R2SqlResult): FormattedResult {
  return {
    contentType: 'application/json',
    body: JSON.stringify({
      success: result.success,
      data: result.data,
      meta: result.meta,
      error: result.error,
    }),
  };
}

/**
 * Format query results as CSV
 */
function formatCsv(result: R2SqlResult): FormattedResult {
  if (!result.success || !result.data || result.data.length === 0) {
    return {
      contentType: 'text/csv',
      body: '',
    };
  }

  const rows = result.data as Record<string, unknown>[];
  const columns = result.meta?.columns?.map(c => c.name) || Object.keys(rows[0]);

  // Header row
  const header = columns.map(escapeCsvValue).join(',');

  // Data rows
  const dataRows = rows.map(row =>
    columns.map(col => escapeCsvValue(row[col])).join(',')
  );

  return {
    contentType: 'text/csv',
    body: [header, ...dataRows].join('\n'),
  };
}

/**
 * Escape a value for CSV output
 */
function escapeCsvValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);

  // Escape quotes and wrap in quotes if contains special chars
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Format query results in the specified format
 */
export function formatResult(
  result: R2SqlResult,
  format: OutputFormat = 'json'
): FormattedResult {
  switch (format) {
    case 'csv':
      return formatCsv(result);
    case 'json':
    default:
      return formatJson(result);
  }
}
