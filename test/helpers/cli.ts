import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runProcess, type ProcessResult } from './process.js';

const testDirectory = path.dirname(fileURLToPath(import.meta.url));
const cliEntryPoint = path.resolve(testDirectory, '../../dist/index.js');

export type RunCliOptions = {
  args: readonly string[];
  cwd: string;
  env: NodeJS.ProcessEnv;
  timeoutMs?: number;
};

export function runCli({ args, cwd, env, timeoutMs }: RunCliOptions): Promise<ProcessResult> {
  return runProcess({
    command: process.execPath,
    args: [cliEntryPoint, ...args],
    cwd,
    env,
    timeoutMs,
  });
}
