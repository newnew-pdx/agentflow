import path from 'node:path';
import { generateReplanRequest } from '../fix/replan-request.js';
import { readReviewResult } from '../review/review-store.js';
import { assertInitialized, getStepDirectory, readStepState, writeStepState, writeText } from '../workflow/step-store.js';

export async function createReplanCommand(stepId: string): Promise<void> {
  if (!(await assertInitialized())) {
    console.error('AgentFlow is not initialized. Run `agentflow init` first.');
    process.exitCode = 1;
    return;
  }

  const state = await readStepState(stepId);
  if (!state) {
    console.error(`Step ${stepId} not found.`);
    process.exitCode = 1;
    return;
  }

  const sourceRunId = state.currentRunId;
  const review = await readReviewResult(stepId, sourceRunId);
  if (!review) {
    console.error(`ReviewResult not found for ${stepId}/${sourceRunId}.`);
    process.exitCode = 1;
    return;
  }

  if (review.verdict !== 'replan_required') {
    console.error(`Review for ${stepId}/${sourceRunId} is ${review.verdict}; replan is not required.`);
    process.exitCode = 1;
    return;
  }

  const now = new Date().toISOString();
  const requestPath = path.join(getStepDirectory(stepId), 'replan-request.md');

  await writeText(requestPath, generateReplanRequest(review));
  await writeStepState(stepId, {
    ...state,
    status: 'REPLAN_DRAFT',
    replanRequestedAt: now,
    replanSourceRunId: sourceRunId,
    updatedAt: now,
  });

  console.log(`Replan request created for ${stepId}.`);
  console.log(`Source Run: ${sourceRunId}`);
  console.log(`Request: ${path.relative(process.cwd(), requestPath)}`);
}
