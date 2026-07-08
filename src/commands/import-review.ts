import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { reviewResultSchema } from '../protocols/review-result.js';
import { generateReviewSummary } from '../review/review-summary.js';
import { runExists, writeReviewResult, writeReviewSummary } from '../review/review-store.js';
import { createStepReviewSummary, mapReviewVerdictToStepStatus } from '../review/review-state.js';
import { assertInitialized, readStepState, writeStepState } from '../workflow/step-store.js';

function formatPath(issuePath: PropertyKey[]): string {
  return issuePath.length === 0 ? '<root>' : issuePath.map(String).join('.');
}

export async function importReviewCommand(file: string): Promise<void> {
  if (!(await assertInitialized())) {
    console.error('AgentFlow is not initialized. Run `agentflow init` first.');
    process.exitCode = 1;
    return;
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path.resolve(file), 'utf8'));
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'unknown error';
    console.error(`JSON parse failed: ${reason}`);
    process.exitCode = 1;
    return;
  }

  const result = reviewResultSchema.safeParse(parsed);
  if (!result.success) {
    console.error('ReviewResult validation failed.');
    for (const issue of result.error.issues) {
      console.error(`- ${formatPath(issue.path)}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  const review = result.data;
  const state = await readStepState(review.stepId);
  if (!state) {
    console.error(`Step ${review.stepId} not found.`);
    process.exitCode = 1;
    return;
  }

  if (!(await runExists(review.stepId, review.runId))) {
    console.error(`Run ${review.stepId}/${review.runId} not found.`);
    process.exitCode = 1;
    return;
  }

  if (state.currentRunId !== review.runId) {
    console.warn(`Warning: importing review for run ${review.runId}, while state currentRunId is ${state.currentRunId}.`);
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

  console.log(`ReviewResult imported for ${review.stepId}/${review.runId}.`);
  console.log(`Verdict: ${review.verdict}`);
  console.log(`Findings: ${review.findings.length}`);
  console.log(`Suggested next action: ${review.suggestedNextAction}`);
  console.log(`Saved to: ${path.relative(process.cwd(), reviewPath)}`);
  console.log(`Summary: ${path.relative(process.cwd(), summaryPath)}`);
}
