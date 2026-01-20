/**
 * Main Setup App component
 * Orchestrates the setup phases using a state machine pattern
 */

import React, { useState, useCallback } from 'react';
import { Box, Static, Text, useApp } from 'ink';
import type { Config, AuthInfo, ExistingResources, DeployedUrls } from './core/types.js';
import { WelcomeScreen } from './components/WelcomeScreen.js';
import { ConfigPrompts } from './components/ConfigPrompts.js';
import { InfrastructurePhase } from './components/InfrastructurePhase.js';
import { DeploymentPhase } from './components/DeploymentPhase.js';
import { SuccessSummary } from './components/SuccessSummary.js';
import { ErrorDisplay } from './components/ErrorDisplay.js';

export type SetupPhase =
  | 'welcome'
  | 'config'
  | 'infrastructure'
  | 'deploy'
  | 'summary'
  | 'error';

export interface SetupContext {
  projectName: string;
  config: Config;
  authInfo: AuthInfo;
  apiToken: string;
  resources: ExistingResources;
  deployedUrls: DeployedUrls;
  warehouseName: string;
  catalogUri: string;
}

const initialResources: ExistingResources = {
  bucket: false,
  catalogEnabled: false,
  stream: { exists: false, id: null },
  sink: { exists: false, id: null },
  pipeline: { exists: false, id: null },
  kvCache: { exists: false, id: null, previewId: null },
  d1Database: { exists: false, id: null },
};

const initialContext: SetupContext = {
  projectName: '',
  config: {
    bucketName: '',
    streamName: '',
    sinkName: '',
    pipelineName: '',
    kvCacheName: '',
    d1DatabaseName: '',
  },
  authInfo: { authenticated: false },
  apiToken: '',
  resources: initialResources,
  deployedUrls: {},
  warehouseName: '',
  catalogUri: '',
};

interface CompletedPhase {
  phase: SetupPhase;
  message: string;
}

export function SetupApp(): React.ReactElement {
  const { exit } = useApp();
  const [phase, setPhase] = useState<SetupPhase>('welcome');
  const [context, setContext] = useState<SetupContext>(initialContext);
  const [completedPhases, setCompletedPhases] = useState<CompletedPhase[]>([]);
  const [error, setError] = useState<Error | null>(null);

  const addCompletedPhase = useCallback((phaseId: SetupPhase, message: string) => {
    setCompletedPhases((prev) => [...prev, { phase: phaseId, message }]);
  }, []);

  const handleWelcomeComplete = useCallback((authInfo: AuthInfo) => {
    setContext((prev) => ({ ...prev, authInfo }));
    addCompletedPhase('welcome', `Authenticated as ${authInfo.email || 'user'}`);
    setPhase('config');
  }, [addCompletedPhase]);

  const handleConfigComplete = useCallback(
    (projectName: string, config: Config, apiToken: string) => {
      setContext((prev) => ({ ...prev, projectName, config, apiToken }));
      addCompletedPhase('config', `Project: ${projectName}`);
      setPhase('infrastructure');
    },
    [addCompletedPhase]
  );

  const handleInfrastructureComplete = useCallback(
    (
      resources: ExistingResources,
      warehouseName: string,
      catalogUri: string
    ) => {
      setContext((prev) => ({
        ...prev,
        resources,
        warehouseName,
        catalogUri,
      }));
      addCompletedPhase('infrastructure', 'Infrastructure ready');
      setPhase('deploy');
    },
    [addCompletedPhase]
  );

  const handleDeploymentComplete = useCallback(
    (deployedUrls: DeployedUrls) => {
      setContext((prev) => ({ ...prev, deployedUrls }));
      addCompletedPhase('deploy', 'Workers deployed');
      setPhase('summary');
    },
    [addCompletedPhase]
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
      {/* Completed phases stay on screen */}
      <Static items={completedPhases}>
        {(item, index) => (
          <Box key={index}>
            <Text color="green">✓ </Text>
            <Text color="gray">{item.message}</Text>
          </Box>
        )}
      </Static>

      {phase === 'welcome' && (
        <WelcomeScreen
          onComplete={handleWelcomeComplete}
          onError={handleError}
        />
      )}

      {phase === 'config' && (
        <ConfigPrompts
          authInfo={context.authInfo}
          onComplete={handleConfigComplete}
          onError={handleError}
        />
      )}

      {phase === 'infrastructure' && (
        <InfrastructurePhase
          projectName={context.projectName}
          config={context.config}
          authInfo={context.authInfo}
          apiToken={context.apiToken}
          onComplete={handleInfrastructureComplete}
          onError={handleError}
        />
      )}

      {phase === 'deploy' && (
        <DeploymentPhase
          projectName={context.projectName}
          config={context.config}
          authInfo={context.authInfo}
          apiToken={context.apiToken}
          resources={context.resources}
          warehouseName={context.warehouseName}
          catalogUri={context.catalogUri}
          onComplete={handleDeploymentComplete}
          onError={handleError}
        />
      )}

      {phase === 'summary' && (
        <SuccessSummary
          config={context.config}
          resources={context.resources}
          deployedUrls={context.deployedUrls}
          onExit={handleExit}
        />
      )}

      {phase === 'error' && error && (
        <ErrorDisplay error={error} onExit={handleExit} />
      )}
    </Box>
  );
}
