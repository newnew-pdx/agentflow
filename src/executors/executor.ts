export type ExecutorName = 'dry-run' | 'manual' | 'codex';

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
};

export interface Executor {
  name: ExecutorName;
  execute(input: ExecutorInput): Promise<ExecutorRunResult>;
}
