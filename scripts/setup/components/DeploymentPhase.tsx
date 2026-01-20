/**
 * Deployment phase component
 * Deploys workers with inline prompts for redeployment
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Box, Text, useInput } from 'ink';
import Spinner from 'ink-spinner';
import { Confirm } from '../../shared/components/Confirm.js';
import type { Config, AuthInfo, ExistingResources, DeployedUrls } from '../core/types.js';
import {
  createEventIngestLocalConfig,
  deployEventIngest,
  checkEventIngestDeployedAsync,
} from '../steps/event-ingest.js';
import {
  createDuckDbApiLocalConfig,
  downloadExtensions,
  deployDuckDbApi,
  setDuckDbApiSecrets,
  checkDuckDbApiDeployedAsync,
} from '../steps/duckdb-api.js';
import {
  createQueryApiLocalConfig,
  runMigrations,
  deployQueryApi,
  setQueryApiSecrets,
  checkQueryApiDeployedAsync,
} from '../steps/query-api.js';
import { extractSubdomainFromUrl, setCachedSubdomain } from '../core/wrangler.js';

interface DeploymentPhaseProps {
  projectName: string;
  config: Config;
  authInfo: AuthInfo;
  apiToken: string;
  resources: ExistingResources;
  warehouseName: string;
  catalogUri: string;
  onComplete: (deployedUrls: DeployedUrls) => void;
  onError: (error: Error) => void;
}

type WorkerType = 'event-ingest' | 'duckdb-api' | 'query-api';
type WorkerStatus = 'pending' | 'checking' | 'prompt' | 'deploying' | 'success' | 'skipped' | 'error';

interface WorkerState {
  status: WorkerStatus;
  url?: string;
  message?: string;
}

export function DeploymentPhase({
  projectName,
  config,
  authInfo,
  apiToken,
  resources,
  warehouseName,
  catalogUri,
  onComplete,
  onError,
}: DeploymentPhaseProps): React.ReactElement {
  const [currentWorker, setCurrentWorker] = useState<WorkerType | null>(null);
  const [workerStates, setWorkerStates] = useState<Record<WorkerType, WorkerState>>({
    'event-ingest': { status: 'pending' },
    'duckdb-api': { status: 'pending' },
    'query-api': { status: 'pending' },
  });
  const [deployedUrls, setDeployedUrls] = useState<DeployedUrls>({});
  const [showPrompt, setShowPrompt] = useState(false);
  const [promptWorker, setPromptWorker] = useState<WorkerType | null>(null);
  const [allDone, setAllDone] = useState(false);

  // Refs for objects used in callbacks - prevents callback recreation on object reference changes
  const authInfoRef = useRef(authInfo);
  const configRef = useRef(config);
  const resourcesRef = useRef(resources);

  // Ref to track when handling a prompt response (prevents effect re-triggering)
  const handlingPromptRef = useRef(false);

  // Sync refs when props change
  useEffect(() => {
    authInfoRef.current = authInfo;
    configRef.current = config;
    resourcesRef.current = resources;
  }, [authInfo, config, resources]);

  // Cache subdomain from URL - uses ref to avoid recreation
  const cacheSubdomain = useCallback(
    (url: string | undefined) => {
      if (url && !authInfoRef.current.subdomain) {
        const subdomain = extractSubdomainFromUrl(url);
        if (subdomain) {
          authInfoRef.current.subdomain = subdomain;
          setCachedSubdomain(subdomain);
        }
      }
    },
    []
  );

  // Update worker state helper
  const updateWorkerState = useCallback((worker: WorkerType, state: Partial<WorkerState>) => {
    setWorkerStates((prev) => ({
      ...prev,
      [worker]: { ...prev[worker], ...state },
    }));
  }, []);

  // Deploy event-ingest worker - uses refs for objects to prevent recreation
  const deployEventIngestWorker = useCallback(async (skipCheck = false) => {
    updateWorkerState('event-ingest', { status: 'checking' });

    // Check skip conditions
    const streamId = resourcesRef.current.stream.id;
    if (!streamId) {
      updateWorkerState('event-ingest', { status: 'skipped', message: 'Stream ID not available' });
      return true;
    }

    // Check if already deployed
    if (!skipCheck) {
      const status = await checkEventIngestDeployedAsync(projectName, authInfoRef.current.subdomain);
      if (status.deployed && status.url) {
        setDeployedUrls((prev) => ({ ...prev, ingest: status.url! }));
        cacheSubdomain(status.url);
        setPromptWorker('event-ingest');
        setShowPrompt(true);
        return false; // Wait for prompt
      }
    }

    // Deploy
    updateWorkerState('event-ingest', { status: 'deploying' });
    const configSuccess = createEventIngestLocalConfig(projectName, streamId);
    if (!configSuccess) {
      updateWorkerState('event-ingest', { status: 'error', message: 'Failed to create config' });
      return true;
    }

    const result = await deployEventIngest();
    if (result.success) {
      updateWorkerState('event-ingest', { status: 'success', url: result.url });
      setDeployedUrls((prev) => ({ ...prev, ingest: result.url }));
      cacheSubdomain(result.url);
    } else {
      updateWorkerState('event-ingest', { status: 'error', message: result.error });
    }
    return true;
  }, [projectName, cacheSubdomain, updateWorkerState]);

  // Deploy duckdb-api worker - uses refs for objects to prevent recreation
  const deployDuckDbApiWorker = useCallback(async (skipCheck = false) => {
    updateWorkerState('duckdb-api', { status: 'checking' });

    // Check skip conditions
    if (!warehouseName || !catalogUri) {
      updateWorkerState('duckdb-api', { status: 'skipped', message: 'Catalog info not available' });
      return true;
    }

    // Check if already deployed
    if (!skipCheck) {
      const status = await checkDuckDbApiDeployedAsync(projectName, authInfoRef.current.subdomain);
      if (status.deployed && status.url) {
        setDeployedUrls((prev) => ({ ...prev, duckdb: status.url! }));
        cacheSubdomain(status.url);
        setPromptWorker('duckdb-api');
        setShowPrompt(true);
        return false;
      }
    }

    // Deploy
    updateWorkerState('duckdb-api', { status: 'deploying' });
    const configSuccess = createDuckDbApiLocalConfig(projectName, warehouseName, catalogUri);
    if (!configSuccess) {
      updateWorkerState('duckdb-api', { status: 'error', message: 'Failed to create config' });
      return true;
    }

    await downloadExtensions();
    const result = await deployDuckDbApi();
    if (result.success) {
      updateWorkerState('duckdb-api', { status: 'success', url: result.url });
      setDeployedUrls((prev) => ({ ...prev, duckdb: result.url }));
      cacheSubdomain(result.url);

      // Set secrets
      if (apiToken) {
        await setDuckDbApiSecrets(apiToken);
      }
    } else {
      updateWorkerState('duckdb-api', { status: 'error', message: result.error });
    }
    return true;
  }, [projectName, warehouseName, catalogUri, apiToken, cacheSubdomain, updateWorkerState]);

  // Deploy query-api worker - uses refs for objects to prevent recreation
  const deployQueryApiWorker = useCallback(async (skipCheck = false) => {
    updateWorkerState('query-api', { status: 'checking' });

    // Read from refs to get current values
    const currentAuthInfo = authInfoRef.current;
    const currentConfig = configRef.current;
    const currentResources = resourcesRef.current;

    // Check skip conditions
    if (!currentAuthInfo.accountId) {
      updateWorkerState('query-api', { status: 'skipped', message: 'Account ID not available' });
      return true;
    }

    // Check if already deployed
    if (!skipCheck) {
      const status = await checkQueryApiDeployedAsync(projectName, currentAuthInfo.subdomain);
      if (status.deployed && status.url) {
        setDeployedUrls((prev) => ({ ...prev, query: status.url! }));
        cacheSubdomain(status.url);
        setPromptWorker('query-api');
        setShowPrompt(true);
        return false;
      }
    }

    // Deploy
    updateWorkerState('query-api', { status: 'deploying' });
    const configSuccess = createQueryApiLocalConfig(projectName, currentConfig.bucketName, {
      kvCacheId: currentResources.kvCache.id,
      kvCachePreviewId: currentResources.kvCache.previewId,
      d1DatabaseId: currentResources.d1Database.id,
      d1DatabaseName: currentConfig.d1DatabaseName,
    });
    if (!configSuccess) {
      updateWorkerState('query-api', { status: 'error', message: 'Failed to create config' });
      return true;
    }

    // Run migrations
    if (currentResources.d1Database.id) {
      await runMigrations(currentConfig.d1DatabaseName);
    }

    const result = await deployQueryApi();
    if (result.success) {
      updateWorkerState('query-api', { status: 'success', url: result.url });
      setDeployedUrls((prev) => ({ ...prev, query: result.url }));
      cacheSubdomain(result.url);

      // Set secrets
      if (currentAuthInfo.accountId && apiToken) {
        await setQueryApiSecrets(currentAuthInfo.accountId, apiToken);
      }
    } else {
      updateWorkerState('query-api', { status: 'error', message: result.error });
    }
    return true;
  }, [projectName, apiToken, cacheSubdomain, updateWorkerState]);

  // Handle prompt response
  const handlePromptResponse = useCallback(
    async (confirmed: boolean) => {
      // Set flag to prevent processWorker effect from re-triggering
      handlingPromptRef.current = true;
      setShowPrompt(false);

      if (!promptWorker) {
        handlingPromptRef.current = false;
        return;
      }

      if (confirmed) {
        // Redeploy
        if (promptWorker === 'event-ingest') {
          await deployEventIngestWorker(true);
        } else if (promptWorker === 'duckdb-api') {
          await deployDuckDbApiWorker(true);
        } else if (promptWorker === 'query-api') {
          await deployQueryApiWorker(true);
        }
      } else {
        // Skip
        updateWorkerState(promptWorker, { status: 'skipped', message: 'Keeping existing deployment' });
      }

      // Move to next worker
      const workers: WorkerType[] = ['event-ingest', 'duckdb-api', 'query-api'];
      const currentIndex = workers.indexOf(promptWorker);
      if (currentIndex < workers.length - 1) {
        setCurrentWorker(workers[currentIndex + 1]);
      } else {
        setAllDone(true);
      }

      // Clear flag after state updates are queued
      handlingPromptRef.current = false;
    },
    [promptWorker, deployEventIngestWorker, deployDuckDbApiWorker, deployQueryApiWorker, updateWorkerState]
  );

  // Start deployment sequence
  useEffect(() => {
    if (!currentWorker) {
      setCurrentWorker('event-ingest');
    }
  }, [currentWorker]);

  // Process current worker
  useEffect(() => {
    // Don't process if: no worker, showing prompt, or handling prompt response
    if (!currentWorker || showPrompt || handlingPromptRef.current) return;

    const processWorker = async () => {
      try {
        let complete = false;

        if (currentWorker === 'event-ingest') {
          complete = await deployEventIngestWorker();
        } else if (currentWorker === 'duckdb-api') {
          complete = await deployDuckDbApiWorker();
        } else if (currentWorker === 'query-api') {
          complete = await deployQueryApiWorker();
        }

        if (complete) {
          // Move to next worker
          const workers: WorkerType[] = ['event-ingest', 'duckdb-api', 'query-api'];
          const currentIndex = workers.indexOf(currentWorker);
          if (currentIndex < workers.length - 1) {
            setCurrentWorker(workers[currentIndex + 1]);
          } else {
            setAllDone(true);
          }
        }
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    };

    processWorker();
  }, [currentWorker, showPrompt, deployEventIngestWorker, deployDuckDbApiWorker, deployQueryApiWorker, onError]);

  // Complete when all done
  useEffect(() => {
    if (allDone) {
      onComplete(deployedUrls);
    }
  }, [allDone, deployedUrls, onComplete]);

  const getWorkerLabel = (worker: WorkerType): string => {
    switch (worker) {
      case 'event-ingest':
        return 'Event Ingest Worker';
      case 'duckdb-api':
        return 'DuckDB API Worker';
      case 'query-api':
        return 'Query API Worker';
    }
  };

  const renderWorkerStatus = (worker: WorkerType) => {
    const state = workerStates[worker];
    const label = getWorkerLabel(worker);

    let icon = '○';
    let color = 'gray';

    switch (state.status) {
      case 'checking':
      case 'deploying':
        return (
          <Box key={worker}>
            <Text color="cyan">
              <Spinner type="dots" />
            </Text>
            <Text> {label}</Text>
            <Text color="gray">
              {state.status === 'checking' ? ' (checking...)' : ' (deploying...)'}
            </Text>
          </Box>
        );
      case 'success':
        icon = '✓';
        color = 'green';
        break;
      case 'skipped':
        icon = '○';
        color = 'yellow';
        break;
      case 'error':
        icon = '✗';
        color = 'red';
        break;
    }

    return (
      <Box key={worker}>
        <Text color={color}>{icon} </Text>
        <Text>{label}</Text>
        {state.message && <Text color="gray"> ({state.message})</Text>}
        {state.url && <Text color="cyan"> {state.url}</Text>}
      </Box>
    );
  };

  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text color="gray">Deploying workers...</Text>
      </Box>

      {renderWorkerStatus('event-ingest')}
      {renderWorkerStatus('duckdb-api')}
      {renderWorkerStatus('query-api')}

      {showPrompt && promptWorker && (
        <Box marginTop={1}>
          <Confirm
            message={`${getWorkerLabel(promptWorker)} is already deployed. Redeploy?`}
            defaultValue={false}
            onConfirm={handlePromptResponse}
          />
        </Box>
      )}
    </Box>
  );
}
