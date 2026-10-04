/**
 * Demo event seeding
 *
 * Generates historical analytics events and sends them to the ingest API.
 * Used by `pnpm generate-events` and the seed step at the end of `pnpm launch`.
 */

export interface SeedOptions {
  /** Base URL of the event ingest worker */
  ingestApiUrl: string;
  /** Days of history to generate (1-365) */
  days?: number;
  /**
   * Events per /v1/batch request. Basin Pipelines accepts up to 5 MB per
   * send(); demo events are ~1 KB, so 1,000 per batch leaves plenty of room.
   */
  batchSize?: number;
  /** Batch requests in flight at once */
  concurrency?: number;
  /** Called after each batch is sent */
  onProgress?: (progress: SeedProgress) => void;
}

export interface SeedProgress {
  batch: number;
  totalBatches: number;
  sent: number;
  total: number;
  error?: string;
}

export interface SeedResult {
  total: number;
  sent: number;
  errors: number;
  userCount: number;
  sessionCount: number;
  eventCounts: Record<string, number>;
  durationMs: number;
}

/**
 * Split an array into chunks of a specified size
 */
function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

/**
 * Generate historical demo events and send them to the ingest API
 */
export async function seedEvents(options: SeedOptions): Promise<SeedResult> {
  const { ingestApiUrl, days = 30, batchSize = 1000, concurrency = 10, onProgress } = options;
  const startTime = Date.now();

  // Reuse the query-api event generator (also used by its daily cron)
  const { generateHistoricalEvents } = await import(
    '../../workers/query-api/src/event-generator/index.js'
  );
  const generated = generateHistoricalEvents(days, 75, 66);

  const batches = chunk(generated.events, batchSize);
  const total = generated.events.length;
  let sent = 0;
  let errors = 0;
  let completed = 0;
  let next = 0;

  const sendBatch = async (batch: unknown[]) => {
    let error: string | undefined;

    try {
      const response = await fetch(`${ingestApiUrl}/v1/batch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch }),
      });

      if (response.ok) {
        sent += batch.length;
      } else {
        error = `${response.status} ${await response.text()}`;
      }
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }

    if (error) errors++;
    completed++;
    onProgress?.({ batch: completed, totalBatches: batches.length, sent, total, error });
  };

  const worker = async () => {
    while (next < batches.length) {
      await sendBatch(batches[next++]);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, batches.length) }, worker));

  return {
    total,
    sent,
    errors,
    userCount: generated.userCount,
    sessionCount: generated.sessionCount,
    eventCounts: generated.eventCounts,
    durationMs: Date.now() - startTime,
  };
}
