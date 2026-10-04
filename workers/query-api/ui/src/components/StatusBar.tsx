interface StatusBarProps {
  rowCount: number | null;
  executionTime: number | null;
  bytesScanned?: number;
  error: string | null;
  onExportCsv?: () => void;
}

function formatBytes(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

export default function StatusBar({
  rowCount,
  executionTime,
  bytesScanned,
  error,
  onExportCsv,
}: StatusBarProps) {
  if (error) {
    return (
      <div className="alert alert-error shadow-sm">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="stroke-current shrink-0 h-5 w-5"
          fill="none"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>{error}</span>
      </div>
    );
  }

  if (rowCount === null) {
    return null;
  }

  return (
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body p-3 flex-row items-center justify-between">
        <div className="text-sm text-base-content/70">
          Results: {rowCount} row{rowCount !== 1 ? 's' : ''}
          {executionTime !== null && (
            <span className="ml-2">({executionTime}ms)</span>
          )}
          {bytesScanned !== undefined && (
            <span className="ml-2">· {formatBytes(bytesScanned)} scanned</span>
          )}
        </div>
        {onExportCsv && (
          <button className="btn btn-sm btn-ghost" onClick={onExportCsv}>
            CSV Export
          </button>
        )}
      </div>
    </div>
  );
}
