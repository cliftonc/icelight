/**
 * Welcome screen component
 * Displays banner and checks authentication
 */

import React, { useEffect, useState } from 'react';
import { Box, Text } from 'ink';
import Spinner from 'ink-spinner';
import { Banner } from '../../shared/components/Banner.js';
import type { AuthInfo } from '../core/types.js';
import { checkWranglerAuth, getLoginInstructions } from '../steps/auth.js';

interface WelcomeScreenProps {
  onComplete: (authInfo: AuthInfo) => void;
  onError: (error: Error) => void;
}

export function WelcomeScreen({
  onComplete,
  onError,
}: WelcomeScreenProps): React.ReactElement {
  const [checking, setChecking] = useState(true);
  const [authFailed, setAuthFailed] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const authInfo = await checkWranglerAuth();

        if (!authInfo.authenticated) {
          setAuthFailed(true);
          setChecking(false);
          return;
        }

        setChecking(false);
        onComplete(authInfo);
      } catch (err) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    };

    checkAuth();
  }, [onComplete, onError]);

  return (
    <Box flexDirection="column">
      <Banner
        text="icelight"
        subtitle="Cloudflare Data Platform → Stream JSON to Iceberg"
      />

      {checking && (
        <Box marginTop={1}>
          <Text color="cyan">
            <Spinner type="dots" />
          </Text>
          <Text> Checking Cloudflare authentication...</Text>
        </Box>
      )}

      {authFailed && (
        <Box flexDirection="column" marginTop={1}>
          <Box>
            <Text color="red">✗ </Text>
            <Text color="red" bold>
              Authentication Required
            </Text>
          </Box>
          <Box marginTop={1} flexDirection="column" marginLeft={2}>
            {getLoginInstructions().map((line, i) => (
              <Text key={i} color={line.startsWith('  ') ? 'cyan' : 'white'}>
                {line}
              </Text>
            ))}
          </Box>
        </Box>
      )}
    </Box>
  );
}
