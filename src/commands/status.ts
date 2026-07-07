import path from 'node:path';
import { pathExists } from '../utils/fs.js';
import { getAgentDirectory } from '../utils/path.js';
import { getExecutionResultPath, listStepRecords } from '../workflow/step-store.js';

export async function statusCommand(): Promise<void> {
  const root = getAgentDirectory();

  if (!(await pathExists(root))) {
    console.log('AgentFlow is not initialized. Run `agentflow init` first.');
    return;
  }

  const steps = await listStepRecords();

  console.log('AgentFlow project detected.');
  console.log(`Steps: ${steps.length}`);

  if (steps.length === 0) {
    return;
  }

  console.log();
  console.log('Steps:');
  for (const { state } of steps) {
    console.log(`- ${state.stepId} | ${state.status} | ${state.goal} | Run: ${state.currentRunId} | Updated: ${state.updatedAt}`);
    const resultPath = getExecutionResultPath(state.stepId, state.currentRunId);
    if (await pathExists(resultPath)) {
      const summary = state.executionResult;
      if (summary) {
        console.log(
          `  ExecutionResult: ${summary.status} | Next: ${summary.suggestedNextAction} | Files changed: ${summary.filesChangedCount}`,
        );
      } else {
        console.log(`  ExecutionResult: ${path.relative(process.cwd(), resultPath)}`);
      }
    }
  }
}
