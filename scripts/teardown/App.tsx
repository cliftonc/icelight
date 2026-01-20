/**
 * Main Teardown App component
 * Orchestrates the teardown phases using a state machine pattern
 */

import React, { useState, useCallback } from 'react';
import { Box, useApp } from 'ink';
import type { Config, AuthInfo, ResourceIds, DeletedResources, TeardownOptions } from './core/types.js';
import { Banner, warningGradient } from '../shared/components/Banner.js';
import { WarningBanner } from './components/WarningBanner.js';
import { ConfirmPrompt } from './components/ConfirmPrompt.js';
import { DeletionPhase } from './components/DeletionPhase.js';
import { TeardownSummary } from './components/TeardownSummary.js';
import { ErrorDisplay } from './components/ErrorDisplay.js';

export type TeardownPhase =
  | 'warning'
  | 'confirm'
  | 'deleting'
  | 'summary'
  | 'error';

export interface TeardownContext {
  projectName: string;
  config: Config;
  authInfo: AuthInfo;
  apiToken: string;
  resourceIds: ResourceIds;
  options: TeardownOptions;
  deletedResources: DeletedResources;
}

interface TeardownAppProps {
  cliOptions: TeardownOptions;
}

export function TeardownApp({ cliOptions }: TeardownAppProps): React.ReactElement {
  const { exit } = useApp();
  const [phase, setPhase] = useState<TeardownPhase>('warning');
  const [context, setContext] = useState<TeardownContext | null>(null);
  const [error, setError] = useState<Error | null>(null);

  const handleWarningComplete = useCallback(
    (projectName: string, config: Config, authInfo: AuthInfo, apiToken: string) => {
      setContext({
        projectName,
        config,
        authInfo,
        apiToken,
        resourceIds: {
          streamId: null,
          sinkId: null,
          pipelineId: null,
          containerIds: new Map(),
          kvCacheId: null,
          kvCachePreviewId: null,
          d1DatabaseId: null,
          existingWorkers: new Set(),
        },
        options: cliOptions,
        deletedResources: {
          workers: [],
          containers: [],
          pipeline: false,
          sink: false,
          stream: false,
          kvCache: false,
          kvCachePreview: false,
          d1Database: false,
          bucket: false,
          localConfigs: [],
        },
      });

      if (cliOptions.confirmed) {
        setPhase('deleting');
      } else {
        setPhase('confirm');
      }
    },
    [cliOptions]
  );

  const handleConfirmComplete = useCallback(
    (confirmed: boolean) => {
      if (confirmed) {
        setPhase('deleting');
      } else {
        exit();
      }
    },
    [exit]
  );

  const handleDeletionComplete = useCallback(
    (deletedResources: DeletedResources) => {
      setContext((prev) =>
        prev ? { ...prev, deletedResources } : null
      );
      setPhase('summary');
    },
    []
  );

  const handleError = useCallback((err: Error) => {
    setError(err);
    setPhase('error');
  }, []);

  const handleExit = useCallback(() => {
    exit();
  }, [exit]);

  return (
    <Box flexDirection="column">
      {/* Banner stays visible at top */}
      <Banner
        text="TEARDOWN"
        font="Small"
        gradient={warningGradient}
        subtitle="icelight → Infrastructure Teardown"
      />

      {phase === 'warning' && (
        <WarningBanner
          options={cliOptions}
          onComplete={handleWarningComplete}
          onError={handleError}
        />
      )}

      {phase === 'confirm' && context && (
        <ConfirmPrompt
          projectName={context.projectName}
          config={context.config}
          options={cliOptions}
          onComplete={handleConfirmComplete}
        />
      )}

      {phase === 'deleting' && context && (
        <DeletionPhase
          projectName={context.projectName}
          config={context.config}
          authInfo={context.authInfo}
          apiToken={context.apiToken}
          options={cliOptions}
          onComplete={handleDeletionComplete}
          onError={handleError}
        />
      )}

      {phase === 'summary' && context && (
        <TeardownSummary
          deletedResources={context.deletedResources}
          config={context.config}
          options={cliOptions}
          onExit={handleExit}
        />
      )}

      {phase === 'error' && error && (
        <ErrorDisplay error={error} onExit={handleExit} />
      )}
    </Box>
  );
}
