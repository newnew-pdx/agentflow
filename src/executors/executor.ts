export type ExecutorName = 'dry-run' | 'manual' | 'codex';
export type CodexSandboxMode = 'read-only' | 'workspace-write';

export type ExecutorInput = {
  stepId: string;
  runId: string;
  projectRoot: string;
  taskPath: string;
  executionRequestPath: string;
  executorRunPath: string;
  rawOutputPath: string;
  candidateOutputPath?: string;
  timeoutMs: number;
  confirmed?: boolean;
  sandboxOverride?: CodexSandboxMode;
};

export type ExecutorRunStatus = 'completed' | 'failed' | 'blocked';

export type ExecutorRunResult = {
  executor: string;
  status: ExecutorRunStatus;
  exitCode?: number;
  rawOutputPath: string;
  candidateOutputPath?: string;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  warnings: string[];
  confirmed?: boolean;
  timedOut?: boolean;
  truncated?: boolean;
  command?: string;
  args?: string[];
  timeoutMs?: number;
  promptMode?: string;
  sandboxOverride?: CodexSandboxMode;
  effectiveSandbox?: CodexSandboxMode | null;
  errorMessage?: string;
};

export interface Executor {
  name: ExecutorName;
  execute(input: ExecutorInput): Promise<ExecutorRunResult>;
}
