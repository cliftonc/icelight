/**
 * Text input component wrapper for ink-text-input
 * Provides a consistent prompt style
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import InkTextInput from 'ink-text-input';

interface TextInputProps {
  label: string;
  placeholder?: string;
  defaultValue?: string;
  mask?: string;
  onSubmit: (value: string) => void;
}

export function TextInput({
  label,
  placeholder,
  defaultValue = '',
  mask,
  onSubmit,
}: TextInputProps): React.ReactElement {
  const [value, setValue] = useState(defaultValue);

  return (
    <Box>
      <Text color="cyan">? </Text>
      <Text>{label}: </Text>
      <InkTextInput
        value={value}
        onChange={setValue}
        onSubmit={onSubmit}
        placeholder={placeholder}
        mask={mask}
      />
    </Box>
  );
}

interface PasswordInputProps {
  label: string;
  onSubmit: (value: string) => void;
}

export function PasswordInput({
  label,
  onSubmit,
}: PasswordInputProps): React.ReactElement {
  const [value, setValue] = useState('');

  return (
    <Box>
      <Text color="cyan">? </Text>
      <Text>{label}: </Text>
      <InkTextInput
        value={value}
        onChange={setValue}
        onSubmit={onSubmit}
        mask="*"
      />
    </Box>
  );
}
