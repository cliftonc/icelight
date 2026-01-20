/**
 * Success summary component
 * Displays final summary after successful setup
 */

import React, { useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import boxen from 'boxen';
import chalk from 'chalk';
import type { Config, ExistingResources, DeployedUrls } from '../core/types.js';
import { colors } from '../core/colors.js';

interface SuccessSummaryProps {
  config: Config;
  resources: ExistingResources;
  deployedUrls: DeployedUrls;
  onExit: () => void;
}

export function SuccessSummary({
  config,
  resources,
  deployedUrls,
  onExit,
}: SuccessSummaryProps): React.ReactElement {
  // Auto-exit after a brief delay to show summary
  useEffect(() => {
    const timer = setTimeout(() => {
      onExit();
    }, 100);
    return () => clearTimeout(timer);
  }, [onExit]);

  const titleBox = boxen(chalk.hex(colors.success)('Setup Complete!'), {
    padding: { left: 2, right: 2, top: 0, bottom: 0 },
    borderColor: colors.success,
    borderStyle: 'double',
  });

  return (
    <Box flexDirection="column">
      <Text>{titleBox}</Text>

      {/* Resources */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold color="white">Resources</Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Text color="cyan">R2 Bucket: <Text color="white">{config.bucketName}</Text></Text>
          <Text color="cyan">Stream: <Text color="white">{config.streamName}</Text></Text>
          {resources.stream.id && (
            <Text color="gray">  ID: {resources.stream.id}</Text>
          )}
          <Text color="cyan">Sink: <Text color="white">{config.sinkName}</Text></Text>
          <Text color="cyan">Pipeline: <Text color="white">{config.pipelineName}</Text></Text>
        </Box>
      </Box>

      {/* Deployed Workers */}
      <Box flexDirection="column" marginTop={1}>
        <Text bold color="white">Deployed Workers</Text>
        <Box flexDirection="column" marginLeft={2} marginTop={1}>
          <Box>
            <Text color="green">✓ </Text>
            <Text>Event Ingest: </Text>
            <Text color={deployedUrls.ingest ? 'cyan' : 'yellow'}>
              {deployedUrls.ingest || '(not deployed)'}
            </Text>
          </Box>
          <Box>
            <Text color="green">✓ </Text>
            <Text>DuckDB API:   </Text>
            <Text color={deployedUrls.duckdb ? 'cyan' : 'yellow'}>
              {deployedUrls.duckdb || '(not deployed)'}
            </Text>
          </Box>
          <Box>
            <Text color="green">✓ </Text>
            <Text>Query API:    </Text>
            <Text color={deployedUrls.query ? 'cyan' : 'yellow'}>
              {deployedUrls.query || '(not deployed)'}
            </Text>
          </Box>
        </Box>
      </Box>

      {/* Test Commands */}
      {deployedUrls.ingest && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="white">Test Event Ingestion</Text>
          <Box flexDirection="column" marginLeft={2} marginTop={1}>
            <Text color="gray">curl -X POST {deployedUrls.ingest}/v1/track \</Text>
            <Text color="gray">  -H "Content-Type: application/json" \</Text>
            <Text color="gray">  -d '{"'{'}"}userId":"test","event":"Test Event"{"'}'"}'</Text>
          </Box>
        </Box>
      )}

      {deployedUrls.query && (
        <Box flexDirection="column" marginTop={1}>
          <Text bold color="white">Open Query UI</Text>
          <Box flexDirection="column" marginLeft={2} marginTop={1}>
            <Text color="cyan">{deployedUrls.query}</Text>
          </Box>
        </Box>
      )}

      <Box marginTop={1}>
        <Text color="gray">See README.md for full documentation.</Text>
      </Box>
    </Box>
  );
}
