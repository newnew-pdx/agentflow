import path from 'node:path';
import { generateFixSummary } from '../fix/fix-summary.js';
import { createFixTaskPacket } from '../fix/fix-task-factory.js';
import { readReviewResult } from '../review/review-store.js';
import { nextRunId } from '../workflow/step-id.js';
import {
  assertInitialized,
  getRunDirectory,
  getTaskPacketPath,
  listRunIds,
  readStepState,
  writeJson,
  writeStepState,
  writeText,
} from '../workflow/step-store.js';

export async function createFixCommand(stepId: string): Promise<void> {
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

  if (review.verdict === 'approved') {
    console.error(`Review for ${stepId}/${sourceRunId} is approved; no fix is needed.`);
    process.exitCode = 1;
    return;
  }

  if (review.verdict === 'replan_required') {
    console.error(`Review for ${stepId}/${sourceRunId} requires replan. Use create-replan ${stepId}.`);
    process.exitCode = 1;
    return;
  }

  if (review.verdict !== 'changes_required' && review.verdict !== 'rejected') {
    console.error(`Review verdict ${review.verdict} cannot create a fix task.`);
    process.exitCode = 1;
    return;
  }

  const newRunId = nextRunId(await listRunIds(stepId));
  const now = new Date().toISOString();
  const task = await createFixTaskPacket({ review, newRunId, createdAt: now });
  const taskPath = getTaskPacketPath(stepId, newRunId);
  const summaryPath = path.join(getRunDirectory(stepId, newRunId), 'fix-from-review.md');

  await writeJson(taskPath, task);
  await writeText(summaryPath, generateFixSummary(review, newRunId));
  await writeStepState(stepId, {
    ...state,
    status: 'FIX_DRAFT',
    currentRunId: newRunId,
    previousRunId: sourceRunId,
    fixCreatedAt: now,
    fixSourceRunId: sourceRunId,
    fixFindingsCount: review.findings.length,
    updatedAt: now,
  });

  console.log(`Fix task created for ${stepId}.`);
  console.log(`Source Run: ${sourceRunId}`);
  console.log(`New Run: ${newRunId}`);
  console.log(`TaskPacket: ${path.relative(process.cwd(), taskPath)}`);
  console.log(`Fix summary: ${path.relative(process.cwd(), summaryPath)}`);
  console.log(`Next action: approve ${stepId}`);
}
