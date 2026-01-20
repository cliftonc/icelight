/**
 * Teardown summary component
 * Displays final summary after teardown
 */

import React, { useEffect } from 'react';
import { Box, Text } from 'ink';
import boxen from 'boxen';
import chalk from 'chalk';
import type { Config, DeletedResources, TeardownOptions } from '../core/types.js';

interface TeardownSummaryProps {
  deletedResources: DeletedResources;
  config: Config;
  options: TeardownOptions;
  onExit: () => void;
}

export function TeardownSummary({
  deletedResources,
  config,
  options,
  onExit,
}: TeardownSummaryProps): React.ReactElement {
  // Auto-exit after showing summary
  useEffect(() => {
    const timer = setTimeout(() => {
      onExit();
    }, 100);
    return () => clearTimeout(timer);
  }, [onExit]);

  const titleBox = boxen(chalk.hex('#22c55e')('Teardown Complete!'), {
    padding: { left: 2, right: 2, top: 0, bottom: 0 },
    borderColor: '#22c55e',
    borderStyle: 'round',
  });

  return (
    <Box flexDirection="column">
      <Text>{titleBox}</Text>

      <Box flexDirection="column" marginTop={1}>
        <Text color="cyan">Summary:</Text>

        <Box marginLeft={2} flexDirection="column" marginTop={1}>
          {/* Workers */}
          {deletedResources.workers.length > 0 ? (
            <Box>
              <Text color="green">✓ </Text>
              <Text>Deleted {deletedResources.workers.length} worker(s)</Text>
            </Box>
          ) : (
            <Box>
              <Text color="yellow">○ </Text>
              <Text color="gray">No workers deleted</Text>
            </Box>
          )}

          {/* Containers */}
          {deletedResources.containers.length > 0 ? (
            <Box>
              <Text color="green">✓ </Text>
              <Text>Deleted {deletedResources.containers.length} container(s)</Text>
            </Box>
          ) : (
            <Box>
              <Text color="yellow">○ </Text>
              <Text color="gray">No containers deleted</Text>
            </Box>
          )}

          {/* Pipeline resources */}
          {deletedResources.pipeline && (
            <Box>
              <Text color="green">✓ </Text>
              <Text>Deleted pipeline</Text>
            </Box>
          )}
          {deletedResources.sink && (
            <Box>
              <Text color="green">✓ </Text>
              <Text>Deleted sink</Text>
            </Box>
          )}
          {deletedResources.stream && (
            <Box>
              <Text color="green">✓ </Text>
              <Text>Deleted stream</Text>
            </Box>
          )}

          {/* KV */}
          {deletedResources.kvCache && (
            <Box>
              <Text color="green">✓ </Text>
              <Text>Deleted KV namespace</Text>
            </Box>
          )}
          {deletedResources.kvCachePreview && (
            <Box>
              <Text color="green">✓ </Text>
              <Text>Deleted KV preview namespace</Text>
            </Box>
          )}

          {/* D1 */}
          {deletedResources.d1Database && (
            <Box>
              <Text color="green">✓ </Text>
              <Text>Deleted D1 database</Text>
            </Box>
          )}

          {/* Bucket */}
          {!options.keepBucket ? (
            deletedResources.bucket ? (
              <Box>
                <Text color="green">✓ </Text>
                <Text>Emptied and deleted R2 bucket</Text>
              </Box>
            ) : null
          ) : (
            <Box flexDirection="column">
              <Box>
                <Text color="yellow">○ </Text>
                <Text>R2 bucket "{config.bucketName}" was preserved</Text>
              </Box>
              <Box marginLeft={2}>
                <Text color="gray">To delete it manually: wrangler r2 bucket delete {config.bucketName}</Text>
              </Box>
            </Box>
          )}

          {/* Local configs */}
          {deletedResources.localConfigs.length > 0 && (
            <Box>
              <Text color="green">✓ </Text>
              <Text>Deleted {deletedResources.localConfigs.length} local config file(s)</Text>
            </Box>
          )}

          <Box>
            <Text color="green">✓ </Text>
            <Text>Preserved .env file</Text>
          </Box>
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text color="cyan">To recreate the infrastructure, run:</Text>
      </Box>
      <Box marginLeft={2}>
        <Text color="white">pnpm launch</Text>
      </Box>
    </Box>
  );
}
