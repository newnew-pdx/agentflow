import { generateReviewSummary } from '../review/review-summary.js';
import { createStepReviewSummary, mapReviewVerdictToStepStatus } from '../review/review-state.js';
import { runExists, writeReviewResult, writeReviewSummary } from '../review/review-store.js';
import type { ExecutionResult } from '../protocols/execution-result.js';
import type { ReviewResult } from '../protocols/review-result.js';
import { getExecutionResultPath, readStepState, writeJson, writeStepState } from '../workflow/step-store.js';

export type ImportSuccess = {
  ok: true;
  savedPath: string;
  summaryPath?: string;
  warning?: string;
};

export type ImportFailure = {
  ok: false;
  message: string;
};

export type ImportResult = ImportSuccess | ImportFailure;

export async function importExecutionResultData(executionResult: ExecutionResult): Promise<ImportResult> {
  const state = await readStepState(executionResult.stepId);
  if (!state) {
    return { ok: false, message: `Step ${executionResult.stepId} not found.` };
  }

  const targetPath = getExecutionResultPath(executionResult.stepId, executionResult.runId);
  await writeJson(targetPath, executionResult);

  const now = new Date().toISOString();
  await writeStepState(executionResult.stepId, {
    ...state,
    status: executionResult.status === 'completed' ? 'RESULT_IMPORTED' : 'BLOCKED',
    importedAt: now,
    updatedAt: now,
    executionResult: {
      status: executionResult.status,
      suggestedNextAction: executionResult.suggestedNextAction,
      filesChangedCount: executionResult.filesChanged.length,
    },
  });

  return {
    ok: true,
    savedPath: targetPath,
    warning:
      state.currentRunId === executionResult.runId
        ? undefined
        : `Warning: importing result for run ${executionResult.runId}, while state currentRunId is ${state.currentRunId}.`,
  };
}

export async function importReviewResultData(review: ReviewResult): Promise<ImportResult> {
  const state = await readStepState(review.stepId);
  if (!state) {
    return { ok: false, message: `Step ${review.stepId} not found.` };
  }

  if (!(await runExists(review.stepId, review.runId))) {
    return { ok: false, message: `Run ${review.stepId}/${review.runId} not found.` };
  }

  const reviewPath = await writeReviewResult(review);
  const summaryPath = await writeReviewSummary(review, generateReviewSummary(review));
  const now = new Date().toISOString();

  await writeStepState(review.stepId, {
    ...state,
    status: mapReviewVerdictToStepStatus(review.verdict),
    updatedAt: now,
    review: createStepReviewSummary(review, now),
  });

  return {
    ok: true,
    savedPath: reviewPath,
    summaryPath,
    warning:
      state.currentRunId === review.runId
        ? undefined
        : `Warning: importing review for run ${review.runId}, while state currentRunId is ${state.currentRunId}.`,
  };
}
