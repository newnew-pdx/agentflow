#!/usr/bin/env node

import { runCli } from './cli.js';
import { formatError } from './core/errors.js';

runCli().catch((error: unknown) => {
  console.error(formatError(error));
  process.exitCode = 1;
});
