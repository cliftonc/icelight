/**
 * Confirmation prompt component
 * Yes/No prompt with keyboard support
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';

interface ConfirmProps {
  message: string;
  defaultValue?: boolean;
  onConfirm: (confirmed: boolean) => void;
}

export function Confirm({
  message,
  defaultValue = false,
  onConfirm,
}: ConfirmProps): React.ReactElement {
  const [isAnswered, setIsAnswered] = useState(false);
  const [answer, setAnswer] = useState<boolean | null>(null);

  useInput((input, key) => {
    if (isAnswered) return;

    if (input.toLowerCase() === 'y') {
      setAnswer(true);
      setIsAnswered(true);
      onConfirm(true);
    } else if (input.toLowerCase() === 'n') {
      setAnswer(false);
      setIsAnswered(true);
      onConfirm(false);
    } else if (key.return) {
      setAnswer(defaultValue);
      setIsAnswered(true);
      onConfirm(defaultValue);
    }
  });

  const hint = defaultValue ? '(Y/n)' : '(y/N)';

  return (
    <Box>
      <Text color="cyan">? </Text>
      <Text>{message} </Text>
      {isAnswered ? (
        <Text color={answer ? 'green' : 'yellow'}>{answer ? 'Yes' : 'No'}</Text>
      ) : (
        <Text color="gray">{hint}</Text>
      )}
    </Box>
  );
}
