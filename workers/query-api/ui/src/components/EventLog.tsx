import { useEffect, useRef } from 'react';
import type { EventLogEntry } from './EventButtons.tsx';

interface EventLogProps {
  entries: EventLogEntry[];
  onClear: () => void;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getTypeBadgeClass(type: string): string {
  switch (type) {
    case 'track':
      return 'badge-primary';
    case 'identify':
      return 'badge-secondary';
    case 'page':
      return 'badge-accent';
    case 'screen':
      return 'badge-info';
    case 'group':
      return 'badge-success';
    case 'alias':
      return 'badge-warning';
    case 'batch':
      return 'badge-error';
    default:
      return 'badge-ghost';
  }
}

export default function EventLog({ entries, onClear }: EventLogProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new entries are added
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [entries.length]);

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <div className="flex items-center justify-between">
          <h2 className="card-title text-sm font-semibold">Event Log</h2>
          <button
            className="btn btn-ghost btn-xs"
            onClick={onClear}
            disabled={entries.length === 0}
          >
            Clear
          </button>
        </div>

        <div
          ref={scrollContainerRef}
          className="bg-base-200 rounded-lg h-64 overflow-y-auto p-2"
        >
          {entries.length === 0 ? (
            <div className="flex items-center justify-center h-full text-base-content/50 text-sm">
              No events sent yet. Click the buttons above to send events.
            </div>
          ) : (
            <div className="space-y-1">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-2 p-2 rounded text-sm ${
                    entry.status === 'error' ? 'bg-error/10' : 'bg-base-100'
                  }`}
                >
                  <span className="font-mono text-xs text-base-content/60 w-16 shrink-0">
                    {formatTime(entry.timestamp)}
                  </span>
                  <span className={`badge badge-xs ${entry.status === 'success' ? 'badge-success' : 'badge-error'}`}>
                    {entry.status === 'success' ? 'OK' : 'ERR'}
                  </span>
                  <span className={`badge badge-xs ${getTypeBadgeClass(entry.type)}`}>
                    {entry.type}
                  </span>
                  <span className="font-mono text-xs text-base-content/70 truncate w-24 shrink-0">
                    {entry.userId}
                  </span>
                  <span className="truncate text-base-content/80">
                    {entry.details}
                  </span>
                  {entry.errorMessage && (
                    <span className="text-error text-xs truncate ml-auto">
                      {entry.errorMessage}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
