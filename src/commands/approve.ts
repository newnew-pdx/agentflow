import { readStepState, writeStepState } from '../workflow/step-store.js';

export async function approveCommand(stepId: string): Promise<void> {
  const state = await readStepState(stepId);
  if (!state) {
    console.error(`Step ${stepId} not found.`);
    process.exitCode = 1;
    return;
  }

  const now = new Date().toISOString();
  await writeStepState(stepId, {
    ...state,
    status: 'APPROVED',
    approvedAt: now,
    updatedAt: now,
  });

  console.log(`Step ${stepId} approved.`);
  console.log(`Next action: export-task ${stepId}`);
}
