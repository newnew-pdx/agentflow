import { spawn } from 'node:child_process';
import type { VerificationCommandResult } from './verification-result.js';

export type CommandRunnerOptions = {
  cwd: string;
  maxOutputChars?: number;
};

const defaultMaxOutputChars = 20_000;

export async function runCommand(command: string, options: CommandRunnerOptions): Promise<VerificationCommandResult> {
  const startedAt = new Date();
  const maxOutputChars = options.maxOutputChars ?? defaultMaxOutputChars;

  return new Promise((resolve) => {
    const child = process.platform === 'win32'
      ? spawn('powershell.exe', ['-NoLogo', '-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
          cwd: options.cwd,
          windowsHide: true,
        })
      : spawn('/bin/sh', ['-c', command], {
          cwd: options.cwd,
        });

    let stdout = '';
    let stderr = '';
    let truncated = false;

    const append = (current: string, chunk: Buffer): string => {
      if (current.length >= maxOutputChars) {
        truncated = true;
        return current;
      }

      const next = current + chunk.toString('utf8');
      if (next.length > maxOutputChars) {
        truncated = true;
        return next.slice(0, maxOutputChars);
      }

      return next;
    };

    child.stdout.on('data', (chunk: Buffer) => {
      stdout = append(stdout, chunk);
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr = append(stderr, chunk);
    });

    child.on('error', (error) => {
      const finishedAt = new Date();
      resolve({
        command,
        exitCode: 1,
        status: 'failed',
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        stdout,
        stderr: append(stderr, Buffer.from(error.message)),
        truncated: truncated || undefined,
      });
    });

    child.on('close', (code) => {
      const finishedAt = new Date();
      const exitCode = code ?? 1;
      resolve({
        command,
        exitCode,
        status: exitCode === 0 ? 'passed' : 'failed',
        startedAt: startedAt.toISOString(),
        finishedAt: finishedAt.toISOString(),
        durationMs: finishedAt.getTime() - startedAt.getTime(),
        stdout,
        stderr,
        truncated: truncated || undefined,
      });
    });
  });
}
