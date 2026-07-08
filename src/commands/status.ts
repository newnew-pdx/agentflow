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
    if (state.verification) {
      console.log(
        `  Verification: ${state.verification.status}, ${state.verification.passed} passed, ${state.verification.failed} failed`,
      );
    }
    if (state.gitCheck) {
      const branch = state.gitCheck.branch ? `, branch ${state.gitCheck.branch}` : '';
      console.log(`  Git: ${state.gitCheck.changedFilesCount} changed files${branch}`);
      if (state.gitCheck.sensitiveWarnings.length > 0) {
        console.log(`  Git warnings: ${state.gitCheck.sensitiveWarnings.length}`);
      }
    }
    if (state.review) {
      const highest = state.review.highestSeverity ?? 'none';
      console.log(
        `  Review: ${state.review.verdict}, findings: ${state.review.findingsCount}, highest: ${highest}, next: ${state.review.suggestedNextAction}`,
      );
    }
  }
}
