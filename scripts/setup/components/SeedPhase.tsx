/**
 * Seed phase component
 * Offers to send demo events to the deployed ingest worker so the
 * dashboards and Basin SQL table are not empty after launch
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { Confirm } from '../../shared/components/Confirm.js';
import { seedEvents, type SeedProgress } from '../../shared/seed-events.js';

const SEED_DAYS = 30;

interface SeedPhaseProps {
  ingestUrl?: string;
  onComplete: (message: string) => void;
}

type SeedStatus = 'prompt' | 'seeding';

export function SeedPhase({ ingestUrl, onComplete }: SeedPhaseProps): React.ReactElement | null {
  const [status, setStatus] = useState<SeedStatus>('prompt');
  const [progress, setProgress] = useState<SeedProgress | null>(null);

  const handleConfirm = useCallback(
    async (confirmed: boolean) => {
      if (!confirmed || !ingestUrl) {
        onComplete('Skipped demo data (run pnpm generate-events later)');
        return;
      }

      setStatus('seeding');
      try {
        const result = await seedEvents({
          ingestApiUrl: ingestUrl,
          days: SEED_DAYS,
          onProgress: setProgress,
        });
        const suffix = result.errors > 0 ? ` (${result.errors} failed batches)` : '';
        onComplete(
          `Seeded ${result.sent.toLocaleString()} demo events${suffix} - visible after the next sink roll (~1-2 min)`
        );
      } catch (err) {
        onComplete(`Demo data seeding failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    },
    [ingestUrl, onComplete]
  );

  // Nothing to seed against without a deployed ingest worker
  useEffect(() => {
    if (!ingestUrl) {
      onComplete('Skipped demo data (ingest worker not deployed)');
    }
  }, [ingestUrl, onComplete]);

  if (!ingestUrl) {
    return null;
  }

  if (status === 'prompt') {
    return (
      <Confirm
        message={`Seed ${SEED_DAYS} days of demo events so dashboards aren't empty?`}
        defaultValue={true}
        onConfirm={handleConfirm}
      />
    );
  }

  return (
    <Box>
      <Text color="cyan">
        <Spinner type="dots" />
      </Text>
      <Text> Seeding demo events</Text>
      {progress && (
        <Text color="gray">
          {' '}({progress.sent.toLocaleString()} / {progress.total.toLocaleString()}, batch {progress.batch}/{progress.totalBatches})
        </Text>
      )}
    </Box>
  );
}
