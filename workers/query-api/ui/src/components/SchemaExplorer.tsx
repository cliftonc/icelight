import { useState, type ChangeEvent } from 'react';
import { useTables, useTableSchema } from '../api/query.ts';

interface SchemaExplorerProps {
  onInsert: (text: string) => void;
}

export default function SchemaExplorer({ onInsert }: SchemaExplorerProps) {
  const [namespace, setNamespace] = useState('analytics');
  const [expandedTable, setExpandedTable] = useState<string | null>(null);

  const { data: tables, isLoading: tablesLoading, error: tablesError } = useTables(namespace);

  return (
    <div className="card bg-base-100 shadow-lg h-full border border-base-300">
      <div className="card-body p-4">
        <div className="flex items-center gap-2 mb-2">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 12h16" />
          </svg>
          <h2 className="font-bold text-sm">Schema Explorer</h2>
        </div>

        <div className="form-control">
          <label className="label py-1">
            <span className="label-text text-xs font-medium">Namespace</span>
          </label>
          <input
            type="text"
            className="input input-bordered input-sm w-full bg-base-200/50"
            value={namespace}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setNamespace(e.target.value)}
            placeholder="analytics"
          />
        </div>

        <div className="divider my-2 text-xs text-base-content/50">Tables</div>

        {tablesLoading && (
          <div className="flex flex-col items-center justify-center py-8 text-base-content/50">
            <span className="loading loading-spinner loading-md"></span>
            <span className="text-xs mt-2">Loading tables...</span>
          </div>
        )}

        {tablesError && (
          <div className="alert alert-error text-xs py-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{tablesError.message}</span>
          </div>
        )}

        {tables && (
          <div className="space-y-2">
            {tables.map((table) => (
              <TableItem
                key={table.table_name}
                namespace={namespace}
                tableName={table.table_name}
                isExpanded={expandedTable === table.table_name}
                onToggle={() =>
                  setExpandedTable(
                    expandedTable === table.table_name ? null : table.table_name
                  )
                }
                onInsert={onInsert}
              />
            ))}
          </div>
        )}

        {tables?.length === 0 && (
          <div className="text-base-content/50 text-xs text-center py-8">
            <svg className="w-8 h-8 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            No tables found
          </div>
        )}
      </div>
    </div>
  );
}

interface TableItemProps {
  namespace: string;
  tableName: string;
  isExpanded: boolean;
  onToggle: () => void;
  onInsert: (text: string) => void;
}

function TableItem({
  namespace,
  tableName,
  isExpanded,
  onToggle,
  onInsert,
}: TableItemProps) {
  const { data: columns, isLoading } = useTableSchema(
    namespace,
    isExpanded ? tableName : ''
  );

  const fullTableName = `${namespace}.${tableName}`;

  return (
    <div className="rounded-lg border border-base-300 overflow-hidden bg-base-200/30">
      <div
        className="flex items-center gap-2 p-2.5 cursor-pointer hover:bg-base-200 transition-colors"
        onClick={onToggle}
      >
        <svg
          className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
        <svg className="w-4 h-4 text-secondary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
        <span
          className="text-sm font-mono font-medium flex-1 hover:text-primary transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onInsert(fullTableName);
          }}
          title={`Click to insert ${fullTableName}`}
        >
          {tableName}
        </span>
      </div>

      {isExpanded && (
        <div className="border-t border-base-300 bg-base-100">
          {isLoading && (
            <div className="flex justify-center py-4">
              <span className="loading loading-spinner loading-sm text-primary"></span>
            </div>
          )}

          {columns && (
            <div className="py-1">
              {columns.map((col) => (
                <div
                  key={col.column_name}
                  className="flex items-center gap-2 px-4 py-1.5 hover:bg-base-200 cursor-pointer transition-colors group"
                  onClick={() => onInsert(col.column_name)}
                  title={`Click to insert ${col.column_name}`}
                >
                  <svg className="w-3 h-3 text-base-content/40 group-hover:text-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                  </svg>
                  <span className="font-mono text-xs flex-1 group-hover:text-primary transition-colors">
                    {col.column_name}
                  </span>
                  <TypeBadge type={col.type} />
                  {col.required === 'true' && (
                    <span className="text-error text-xs font-bold" title="Required">*</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TypeBadge({ type }: { type: string }) {
  const getTypeColor = (t: string) => {
    const upper = t.toUpperCase();
    if (upper.includes('TEXT') || upper.includes('STRING') || upper.includes('VARCHAR')) {
      return 'badge-info';
    }
    if (upper.includes('INT') || upper.includes('DECIMAL') || upper.includes('FLOAT') || upper.includes('DOUBLE')) {
      return 'badge-success';
    }
    if (upper.includes('TIMESTAMP') || upper.includes('DATE') || upper.includes('TIME')) {
      return 'badge-warning';
    }
    if (upper.includes('BOOL')) {
      return 'badge-secondary';
    }
    return 'badge-ghost';
  };

  return (
    <span className={`badge badge-xs ${getTypeColor(type)}`}>
      {type}
    </span>
  );
}
