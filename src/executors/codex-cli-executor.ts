import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { CodexExecutorConfig } from './executor-config.js';
import type { Executor, ExecutorInput, ExecutorRunResult } from './executor.js';
import { createTimedResult, writeExecutorOutput } from './executor-run-store.js';

export class CodexCliExecutor implements Executor {
  readonly name = 'codex' as const;

  constructor(private readonly config: CodexExecutorConfig) {}

  async execute(input: ExecutorInput): Promise<ExecutorRunResult> {
    const startedAt = new Date();
    const executionRequest = await readFile(input.executionRequestPath, 'utf8');
    const command = this.config.command;
    const args = this.config.args;
    const timeoutMs = input.timeoutMs;
    const maxOutputChars = this.config.maxOutputChars;
    const promptMode = this.config.promptMode;
    const stdin = createCodexStdin({
      promptMode,
      executionRequest,
      executionRequestPath: input.executionRequestPath,
    });

    try {
      const result = await runCommand({
        command,
        args,
        cwd: input.projectRoot,
        stdin,
        timeoutMs,
      });
      const output = prepareOutput(result.stdout, result.stderr, maxOutputChars);
      const status = result.exitCode === 0 && !result.timedOut ? 'completed' : 'failed';
      const errorMessage = result.timedOut
        ? 'Codex CLI timed out.'
        : result.exitCode === 0
          ? undefined
          : `Codex CLI exited with code ${result.exitCode}.`;

      await writeExecutorOutput(
        input.rawOutputPath,
        renderCodexOutput({
          command,
          args,
          status,
          exitCode: result.exitCode,
          timedOut: result.timedOut,
          stdout: output.stdout,
          stderr: output.stderr,
          truncated: output.truncated,
          promptMode,
          stdinPreview: stdin,
        }),
      );

      return createTimedResult({
        executor: this.name,
        status,
        exitCode: result.exitCode,
        rawOutputPath: input.rawOutputPath,
        startedAt,
        warnings: [
          ...(result.timedOut ? ['Codex CLI timed out and was killed.'] : []),
          ...(output.truncated ? ['Codex CLI output was truncated.'] : []),
        ],
        confirmed: input.confirmed,
        timedOut: result.timedOut,
        truncated: output.truncated,
        command,
        args,
        timeoutMs,
        promptMode,
        errorMessage,
      });
    } catch (error: unknown) {
      const message = safeErrorMessage(error);
      const isMissingCommand = isCommandNotFound(error);
      const errorMessage = isMissingCommand ? 'Codex CLI command not found' : message;
      const warnings = isMissingCommand
        ? [
            'Codex CLI command not found. Configure .agent/config.yaml with executors.codex.command.',
          ]
        : [message];

      await writeExecutorOutput(
        input.rawOutputPath,
        renderCodexOutput({
          command,
          args,
          status: 'failed',
          exitCode: isMissingCommand ? 127 : 1,
          timedOut: false,
          stdout: '',
          stderr: errorMessage,
          truncated: false,
          promptMode,
          stdinPreview: stdin,
          notes: isMissingCommand
            ? [
                'Codex CLI command not found. Configure .agent/config.yaml with executors.codex.command.',
                'This output has not been trusted as final state.',
              ]
            : undefined,
        }),
      );

      return createTimedResult({
        executor: this.name,
        status: 'failed',
        exitCode: isMissingCommand ? 127 : 1,
        rawOutputPath: input.rawOutputPath,
        startedAt,
        warnings,
        confirmed: input.confirmed,
        timedOut: false,
        truncated: false,
        command,
        args,
        timeoutMs,
        promptMode,
        errorMessage,
      });
    }
  }
}

type CommandResult = {
  exitCode: number;
  stdout: string;
  stderr: string;
  timedOut: boolean;
};

function runCommand(input: {
  command: string;
  args: string[];
  cwd: string;
  stdin: string;
  timeoutMs: number;
}): Promise<CommandResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(input.command, input.args, {
      cwd: input.cwd,
      shell: false,
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    let settled = false;
    let timedOut = false;

    const timeout = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, input.timeoutMs);

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk: string) => {
      stderr += chunk;
    });
    child.on('error', (error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      reject(error);
    });
    child.on('close', (code) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      resolve({ exitCode: timedOut ? 124 : code ?? 1, stdout, stderr, timedOut });
    });

    child.stdin.on('error', () => {
      // Spawn errors such as ENOENT are handled by the child error event.
    });
    try {
      child.stdin.write(input.stdin, 'utf8');
      child.stdin.end();
    } catch {
      child.stdin.destroy();
    }
  });
}

function renderCodexOutput(input: {
  command: string;
  args: string[];
  status: 'completed' | 'failed';
  exitCode: number;
  timedOut: boolean;
  stdout: string;
  stderr: string;
  truncated: boolean;
  promptMode: string;
  stdinPreview: string;
  notes?: string[];
}): string {
  const notes = input.notes ?? [
    'This output has not been trusted as final state.',
    'Run import-candidate only if it contains a valid ExecutionResult JSON.',
  ];

  return `# Executor Output

## Executor

- Name: codex
- Status: ${input.status}
- Exit Code: ${input.exitCode}
- Timed Out: ${input.timedOut ? 'yes' : 'no'}
- Command: ${input.command}
- Args: ${input.args.length > 0 ? input.args.join(' ') : '(none)'}
- PromptMode: ${input.promptMode}
- Truncated: ${input.truncated ? 'yes' : 'no'}

## Stdin Prompt

${input.stdinPreview}

${input.truncated ? '[Output truncated by AgentFlow]\n\n' : ''}## Stdout

${input.stdout || '(empty)'}

## Stderr

${input.stderr || '(empty)'}

## Notes

${notes.map((note) => `- ${note}`).join('\n')}
`;
}

function isCommandNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT';
}

function prepareOutput(stdout: string, stderr: string, maxOutputChars: number): {
  stdout: string;
  stderr: string;
  truncated: boolean;
} {
  const preparedStdout = truncateText(stdout, maxOutputChars);
  const preparedStderr = truncateText(stderr, maxOutputChars);
  return {
    stdout: preparedStdout.text,
    stderr: preparedStderr.text,
    truncated: preparedStdout.truncated || preparedStderr.truncated,
  };
}

function truncateText(value: string, maxChars: number): { text: string; truncated: boolean } {
  if (value.length <= maxChars) return { text: value, truncated: false };
  return {
    text: `${value.slice(0, maxChars)}\n\n[Output truncated by AgentFlow]`,
    truncated: true,
  };
}

function safeErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return 'Codex CLI execution failed.';
  if (isCommandNotFound(error)) return 'Codex CLI command not found';
  return error.message || 'Codex CLI execution failed.';
}

function createCodexStdin(input: {
  promptMode: string;
  executionRequest: string;
  executionRequestPath: string;
}): string {
  if (input.promptMode !== 'file-reference') return input.executionRequest;

  const requestPath = toRelativePath(input.executionRequestPath);
  return `You are running as the AgentFlow Codex executor.

Read the full execution request from this UTF-8 file:

${requestPath}

On Windows PowerShell, read it with:
Get-Content -Raw -Encoding UTF8 "${requestPath}"

Then follow the instructions in that file exactly.

Important:
- Do not commit.
- Do not push.
- Do not modify files if the task says no-op.
- Preserve AgentFlow protocol boundaries.
- At the end, output ExecutionResult JSON only, or include a clearly fenced JSON block containing the ExecutionResult.
`;
}

function toRelativePath(targetPath: string): string {
  return path.relative(process.cwd(), targetPath).replace(/\\/g, '/');
}
