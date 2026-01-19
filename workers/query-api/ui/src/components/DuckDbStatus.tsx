import {
  useDuckDbHealth,
  getContainerStatus,
  type ContainerStatus,
} from '../api/duckdb-health.ts';

const statusConfig: Record<
  ContainerStatus,
  { color: string; label: string; description: string }
> = {
  running: {
    color: 'bg-success',
    label: 'Running',
    description: 'DuckDB container is warm and ready',
  },
  starting: {
    color: 'bg-warning',
    label: 'Starting',
    description: 'DuckDB container is starting up (cold start)',
  },
  error: {
    color: 'bg-error',
    label: 'Error',
    description: 'Unable to connect to DuckDB API',
  },
  unknown: {
    color: 'bg-base-content/30',
    label: 'Checking',
    description: 'Checking DuckDB status...',
  },
};

export default function DuckDbStatus() {
  const { data, isLoading, isFetching, refetch } = useDuckDbHealth();

  const status = isLoading ? 'unknown' : getContainerStatus(data);
  const config = statusConfig[status];

  return (
    <div className="dropdown dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-sm gap-2">
        <span
          className={`w-2 h-2 rounded-full ${config.color} ${isFetching ? 'animate-pulse' : ''}`}
        />
        <span className="text-xs hidden sm:inline">DuckDB</span>
      </div>
      <div
        tabIndex={0}
        className="dropdown-content z-50 p-3 shadow-xl bg-base-100 border border-base-300 rounded-lg w-52"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${config.color}`} />
            <span className="text-sm font-medium">{config.label}</span>
          </div>
          <button
            className="btn btn-xs btn-ghost btn-square"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? (
              <span className="loading loading-spinner loading-xs" />
            ) : (
              <svg
                className="w-3 h-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            )}
          </button>
        </div>
        <p className="text-xs text-base-content/60 mt-1">{config.description}</p>
        {data?.error && (
          <div className="mt-2 p-1.5 bg-error/10 rounded text-xs text-error">
            {data.error}
          </div>
        )}
      </div>
    </div>
  );
}
