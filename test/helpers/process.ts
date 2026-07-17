import { spawn } from 'node:child_process';

export type ProcessResult = {
  command: string;
  args: readonly string[];
  cwd: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  spawnError?: Error;
  timedOut: boolean;
};

export type RunProcessOptions = {
  command: string;
  args: readonly string[];
  cwd: string;
  env?: NodeJS.ProcessEnv;
  timeoutMs?: number;
};

export async function runProcess({
  command,
  args,
  cwd,
  env,
  timeoutMs = 10_000,
}: RunProcessOptions): Promise<ProcessResult> {
  return new Promise((resolve) => {
    let stdout = '';
    let stderr = '';
    let spawnError: Error | undefined;
    let timedOut = false;
    let settled = false;

    const child = spawn(command, [...args], {
      cwd,
      env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    const finish = (exitCode: number | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ command, args, cwd, stdout, stderr, exitCode, spawnError, timedOut });
    };

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.once('error', (error) => {
      spawnError = error;
      finish(null);
    });
    child.once('close', (exitCode) => {
      finish(exitCode);
    });

    const timeout = setTimeout(() => {
      timedOut = true;
      stderr += `Process timed out after ${timeoutMs}ms.\n`;
      child.kill();
    }, timeoutMs);
  });
}

export function describeProcessFailure(result: ProcessResult): string {
  const args = result.args.map((arg) => JSON.stringify(arg)).join(' ');
  const reason = result.spawnError
    ? `spawn error: ${result.spawnError.message}`
    : result.timedOut
      ? 'timed out'
      : `exit code: ${result.exitCode ?? 'unknown'}`;
  return [
    `Command failed (${reason}): ${result.command} ${args}`,
    `cwd: ${result.cwd}`,
    result.stdout ? `stdout:\n${result.stdout}` : '',
    result.stderr ? `stderr:\n${result.stderr}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}
