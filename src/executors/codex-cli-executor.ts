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

    try {
      const result = await runCommand({
        command: this.config.command,
        args: this.config.args,
        cwd: input.projectRoot,
        stdin: executionRequest,
        timeoutMs: input.timeoutMs,
      });

      await writeExecutorOutput(input.rawOutputPath, renderCodexOutput(this.config.command, this.config.args, result));

      return createTimedResult({
        executor: this.name,
        status: result.exitCode === 0 ? 'completed' : 'failed',
        exitCode: result.exitCode,
        rawOutputPath: input.rawOutputPath,
        startedAt,
        warnings: [],
      });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Codex CLI execution failed.';
      const isMissingCommand = isCommandNotFound(error);
      const warnings = isMissingCommand
        ? [
            'Codex CLI command not found. Configure .agent/config.yaml with executors.codex.command.',
          ]
        : [message];

      await writeExecutorOutput(
        input.rawOutputPath,
        `# Codex CLI Executor Output

${isMissingCommand ? 'Codex CLI command not found.' : 'Codex CLI execution failed.'}

Configure .agent/config.yaml:

\`\`\`yaml
executors:
  codex:
    command: "codex"
    args: []
    timeoutMs: 600000
\`\`\`

Command attempted:

\`\`\`text
${this.config.command} ${this.config.args.join(' ')}
\`\`\`

Error:

\`\`\`text
${message}
\`\`\`
`,
      );

      return createTimedResult({
        executor: this.name,
        status: 'failed',
        exitCode: isMissingCommand ? 127 : 1,
        rawOutputPath: input.rawOutputPath,
        startedAt,
        warnings,
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

    child.stdin.write(input.stdin);
    child.stdin.end();
  });
}

function renderCodexOutput(command: string, args: string[], result: CommandResult): string {
  return `# Codex CLI Executor Output

Command:

\`\`\`text
${command} ${args.join(' ')}
\`\`\`

Exit code: ${result.exitCode}
Timed out: ${result.timedOut ? 'yes' : 'no'}

## Stdout

\`\`\`text
${result.stdout}
\`\`\`

## Stderr

\`\`\`text
${result.stderr}
\`\`\`
`;
}

function isCommandNotFound(error: unknown): boolean {
  return error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT';
}
