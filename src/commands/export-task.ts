import path from 'node:path';
import { pathExists } from '../utils/fs.js';
import { getTaskPacketPath, readStepState, writeStepState } from '../workflow/step-store.js';

export async function exportTaskCommand(stepId: string): Promise<void> {
  const state = await readStepState(stepId);
  if (!state) {
    console.error(`Step ${stepId} not found.`);
    process.exitCode = 1;
    return;
  }

  const taskPath = getTaskPacketPath(stepId, state.currentRunId);
  if (!(await pathExists(taskPath))) {
    console.error(`TaskPacket not found: ${path.relative(process.cwd(), taskPath)}`);
    process.exitCode = 1;
    return;
  }

  if (state.status !== 'APPROVED') {
    console.warn(`Warning: Step ${stepId} is ${state.status}, not APPROVED. Export continues in Step3.`);
  }

  const now = new Date().toISOString();
  await writeStepState(stepId, {
    ...state,
    status: 'EXPORTED',
    exportedAt: now,
    updatedAt: now,
  });

  console.log('Task exported:');
  console.log(path.relative(process.cwd(), taskPath));
}
