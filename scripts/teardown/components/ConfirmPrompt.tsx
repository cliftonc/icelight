/**
 * Confirmation prompt component for teardown
 */

import React from 'react';
import { Box, Text } from 'ink';
import { Confirm } from '../../shared/components/Confirm.js';
import type { Config, TeardownOptions } from '../core/types.js';
import { getWorkerNamesList, getContainerNamesList } from '../steps/config.js';

interface ConfirmPromptProps {
  projectName: string;
  config: Config;
  options: TeardownOptions;
  onComplete: (confirmed: boolean) => void;
}

export function ConfirmPrompt({
  projectName,
  config,
  options,
  onComplete,
}: ConfirmPromptProps): React.ReactElement {
  const workers = getWorkerNamesList(projectName);
  const containers = getContainerNamesList(projectName);

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="red" bold>Resources to delete:</Text>
      </Box>
      <Box marginLeft={2} flexDirection="column" marginBottom={1}>
        {workers.map((name) => (
          <Text key={`worker-${name}`} color="gray">• {name}</Text>
        ))}
        {containers.map((name) => (
          <Text key={`container-${name}`} color="gray">• {name}</Text>
        ))}
        <Text color="gray">• {config.pipelineName}</Text>
        <Text color="gray">• {config.sinkName}</Text>
        <Text color="gray">• {config.streamName}</Text>
        <Text color="gray">• {config.kvCacheName}</Text>
        <Text color="gray">• {config.d1DatabaseName}</Text>
        {!options.keepBucket ? (
          <Text color="red">• {config.bucketName} (and ALL data!)</Text>
        ) : (
          <Text color="green">• {config.bucketName} (keeping)</Text>
        )}
      </Box>

      <Confirm
        message="Delete these resources?"
        defaultValue={false}
        onConfirm={onComplete}
      />
    </Box>
  );
}
