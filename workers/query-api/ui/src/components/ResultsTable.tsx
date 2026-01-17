interface ResultsTableProps {
  data: Record<string, unknown>[];
  columns: string[];
}

export default function ResultsTable({ data, columns }: ResultsTableProps) {
  if (data.length === 0) {
    return (
      <div className="card bg-base-100 shadow-sm">
        <div className="card-body p-4 text-center text-base-content/50">
          No results
        </div>
      </div>
    );
  }

  return (
    <div className="card bg-base-100 shadow-sm overflow-x-auto">
      <table className="table table-sm">
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col} className="font-semibold whitespace-nowrap">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, rowIdx) => (
            <tr key={rowIdx} className="hover">
              {columns.map((col) => (
                <td key={col} className="whitespace-nowrap max-w-xs truncate">
                  {formatCell(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
