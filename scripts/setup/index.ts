#!/usr/bin/env tsx
/**
 * icelight Infrastructure Setup
 *
 * Main entry point for the Ink-based setup system.
 * Uses React/Ink for a modern CLI experience.
 *
 * Usage: pnpm launch
 */

import React from 'react';
import { render } from 'ink';
import { SetupApp } from './App.js';

// Render the Ink app
render(React.createElement(SetupApp));
