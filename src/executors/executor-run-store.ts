import path from 'node:path';
import { writeJson, writeStepState, writeText } from '../workflow/step-store.js';
import type { StepState } from '../workflow/step-state.js';
import type { ExecutorInput, ExecutorRunResult } from './executor.js';

export type ExecutorRunRecord = {
  stepId: string;
  runId: string;
  executor: string;
  status: ExecutorRunResult['status'];
  exitCode?: number;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  input: {
    taskPath: string;
    executionRequestPath: string;
  };
  output: {
    rawOutputPath: string;
    candidateOutputPath?: string;
  };
  warnings: string[];
};

export async function writeExecutorOutput(targetPath: string, content: string): Promise<void> {
  await writeText(targetPath, ensureTrailingNewline(content));
}

export async function writeExecutorRunRecord(input: ExecutorInput, result: ExecutorRunResult): Promise<ExecutorRunRecord> {
  const record: ExecutorRunRecord = {
    stepId: input.stepId,
    runId: input.runId,
    executor: result.executor,
    status: result.status,
    exitCode: result.exitCode,
    startedAt: result.startedAt,
    finishedAt: result.finishedAt,
    durationMs: result.durationMs,
    input: {
      taskPath: toRelativePath(input.taskPath),
      executionRequestPath: toRelativePath(input.executionRequestPath),
    },
    output: {
      rawOutputPath: toRelativePath(result.rawOutputPath),
      candidateOutputPath: result.candidateOutputPath ? toRelativePath(result.candidateOutputPath) : undefined,
    },
    warnings: result.warnings,
  };

  await writeJson(input.executorRunPath, record);
  return record;
}

export async function updateStateWithExecutorRun(state: StepState, record: ExecutorRunRecord): Promise<StepState> {
  const nextState: StepState = {
    ...state,
    updatedAt: record.finishedAt,
    executorRun: {
      executor: record.executor,
      status: record.status,
      runAt: record.finishedAt,
      rawOutputPath: record.output.rawOutputPath,
      exitCode: record.exitCode,
      warnings: record.warnings,
    },
  };

  await writeStepState(state.stepId, nextState);
  return nextState;
}

export function createTimedResult(input: {
  executor: string;
  status: ExecutorRunResult['status'];
  exitCode?: number;
  rawOutputPath: string;
  candidateOutputPath?: string;
  startedAt: Date;
  warnings?: string[];
}): ExecutorRunResult {
  const finishedAt = new Date();
  return {
    executor: input.executor,
    status: input.status,
    exitCode: input.exitCode,
    rawOutputPath: input.rawOutputPath,
    candidateOutputPath: input.candidateOutputPath,
    startedAt: input.startedAt.toISOString(),
    finishedAt: finishedAt.toISOString(),
    durationMs: finishedAt.getTime() - input.startedAt.getTime(),
    warnings: input.warnings ?? [],
  };
}

function ensureTrailingNewline(content: string): string {
  return content.endsWith('\n') ? content : `${content}\n`;
}

function toRelativePath(targetPath: string): string {
  return path.relative(process.cwd(), targetPath).replace(/\\/g, '/');
}
