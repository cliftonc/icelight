/**
 * Configuration prompts component
 * Collects project name and API token
 */

import React, { useState, useEffect } from 'react';
import { Box, Text, useInput } from 'ink';
import InkTextInput from 'ink-text-input';
import type { Config, AuthInfo } from '../core/types.js';
import { getSavedProjectName, deriveConfig, getConfigDisplayLines } from '../steps/config.js';
import { getSavedApiToken, hasApiToken, getTokenRequirements } from '../steps/token.js';
import { saveToEnvFile } from '../core/env.js';
import { fetchSubdomainFromApi } from '../core/wrangler.js';

type PromptStep = 'project' | 'token-info' | 'token' | 'confirm';

interface ConfigPromptsProps {
  authInfo: AuthInfo;
  onComplete: (projectName: string, config: Config, apiToken: string) => void;
  onError: (error: Error) => void;
}

export function ConfigPrompts({
  authInfo,
  onComplete,
  onError,
}: ConfigPromptsProps): React.ReactElement {
  const [step, setStep] = useState<PromptStep>('project');
  const [projectName, setProjectName] = useState(getSavedProjectName());
  const [apiToken, setApiToken] = useState('');
  const [inputValue, setInputValue] = useState('');

  // Initialize with saved values
  useEffect(() => {
    const savedName = getSavedProjectName();
    setProjectName(savedName);
    setInputValue(savedName);

    const savedToken = getSavedApiToken();
    setApiToken(savedToken);
  }, []);

  const handleProjectSubmit = (value: string) => {
    const name = value.trim() || getSavedProjectName();
    setProjectName(name);

    // Save if different from saved
    if (name !== getSavedProjectName()) {
      saveToEnvFile('CDPFLARE_PROJECT_NAME', name);
    }

    // Check if we need token
    if (!hasApiToken()) {
      setStep('token-info');
    } else {
      finishSetup(name, apiToken);
    }
  };

  const handleTokenSubmit = (value: string) => {
    if (value.trim()) {
      setApiToken(value.trim());
      saveToEnvFile('CDPFLARE_API_TOKEN', value.trim());
      finishSetup(projectName, value.trim());
    }
  };

  const finishSetup = async (name: string, token: string) => {
    try {
      const config = deriveConfig(name);

      // Try to fetch subdomain
      if (authInfo.accountId && token) {
        const subdomain = await fetchSubdomainFromApi(authInfo.accountId, token);
        if (subdomain) {
          authInfo.subdomain = subdomain;
        }
      }

      onComplete(name, config, token);
    } catch (err) {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  };

  // Handle token info screen - any key to continue
  useInput(
    (input, key) => {
      if (step === 'token-info' && (key.return || input)) {
        setStep('token');
        setInputValue('');
      }
    },
    { isActive: step === 'token-info' }
  );

  return (
    <Box flexDirection="column">
      {/* Project name prompt */}
      {step === 'project' && (
        <Box>
          <Text color="cyan">? </Text>
          <Text>Project name: </Text>
          <InkTextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleProjectSubmit}
            placeholder={getSavedProjectName()}
          />
        </Box>
      )}

      {/* Token info screen */}
      {step === 'token-info' && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text color="yellow">⚠ </Text>
            <Text color="yellow" bold>
              API Token Required
            </Text>
          </Box>
          <Box flexDirection="column" marginLeft={2}>
            {getTokenRequirements().map((line, i) => (
              <Text key={i} color={line.startsWith('  ') ? 'gray' : 'white'}>
                {line}
              </Text>
            ))}
          </Box>
          <Box marginTop={1}>
            <Text color="gray">Press any key to continue...</Text>
          </Box>
        </Box>
      )}

      {/* Token input */}
      {step === 'token' && (
        <Box>
          <Text color="cyan">? </Text>
          <Text>API Token: </Text>
          <InkTextInput
            value={inputValue}
            onChange={setInputValue}
            onSubmit={handleTokenSubmit}
            mask="*"
          />
        </Box>
      )}

      {/* Show config preview after project name is set */}
      {step !== 'project' && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="gray">Configuration:</Text>
          <Box flexDirection="column" marginLeft={2}>
            {getConfigDisplayLines(deriveConfig(projectName), projectName).map(
              (line, i) => (
                <Text key={i} color="gray">
                  {line}
                </Text>
              )
            )}
          </Box>
        </Box>
      )}
    </Box>
  );
}
