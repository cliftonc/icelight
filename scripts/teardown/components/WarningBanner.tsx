/**
 * Warning banner component for teardown
 * Checks auth and loads configuration
 */

import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import type { Config, AuthInfo, TeardownOptions } from '../core/types.js';
import { checkWranglerAuth } from '../../setup/steps/auth.js';
import { loadTeardownConfig } from '../steps/config.js';

interface WarningBannerProps {
  options: TeardownOptions;
  onComplete: (projectName: string, config: Config, authInfo: AuthInfo, apiToken: string) => void;
  onError: (error: Error) => void;
}

export function WarningBanner({
  options: _options,
  onComplete,
  onError,
}: WarningBannerProps): React.ReactElement {
  const [checking, setChecking] = useState(true);
  const [authFailed, setAuthFailed] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        // Check auth
        const authInfo = await checkWranglerAuth();

        if (!authInfo.authenticated) {
          setAuthFailed(true);
          setChecking(false);
          return;
        }

        // Load config
        const teardownConfig = loadTeardownConfig();
        setChecking(false);

        onComplete(
          teardownConfig.projectName,
          teardownConfig.config,
          authInfo,
          teardownConfig.apiToken
        );
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    };

    init();
  }, [onComplete, onError]);

  return (
    <Box flexDirection="column">
      {checking && (
        <Box>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Checking authentication...</Text>
        </Box>
      )}

      {authFailed && (
        <Box flexDirection="column">
          <Box>
            <Text color="red">✗ </Text>
            <Text color="red" bold>
              Authentication Required
            </Text>
          </Box>
          <Box marginTop={1} marginLeft={2} flexDirection="column">
            <Text>Not logged in to Cloudflare</Text>
            <Text color="gray">Please run: </Text>
            <Text color="cyan">  wrangler login</Text>
          </Box>
        </Box>
      )}
    </Box>
  );
}
