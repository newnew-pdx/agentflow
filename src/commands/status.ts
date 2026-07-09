import path from 'node:path';
import { pathExists } from '../utils/fs.js';
import { getAgentDirectory } from '../utils/path.js';
import { getExecutionPromptPath, getExecutionResultPath, getRunDirectory, getStepDirectory, listStepRecords } from '../workflow/step-store.js';

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
    const promptPath = getExecutionPromptPath(state.stepId, state.currentRunId);
    console.log(`  Execution Prompt: ${(await pathExists(promptPath)) ? 'generated' : 'missing'}`);
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
    const executorRunPath = path.join(getRunDirectory(state.stepId, state.currentRunId), 'executor-run.json');
    if (await pathExists(executorRunPath)) {
      if (state.executorRun) {
        if (state.executorRun.executor === 'codex') {
          const detail = state.executorRun.timedOut
            ? 'timed out'
            : state.executorRun.exitCode !== undefined
              ? `exitCode: ${state.executorRun.exitCode}`
              : undefined;
          console.log(
            `  Executor: codex, ${state.executorRun.status}${detail ? `, ${detail}` : ''}`,
          );
        } else {
          console.log(`  Executor: ${state.executorRun.executor}, ${state.executorRun.status}`);
        }
      } else {
        console.log(`  Executor: ${path.relative(process.cwd(), executorRunPath)}`);
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
    if (state.checkpoint) {
      if (state.checkpoint.status === 'blocked') {
        console.log(`  Checkpoint: blocked, reasons: ${state.checkpoint.blockingReasons.length}`);
      } else {
        console.log(`  Checkpoint: ${state.checkpoint.status}, summary: ${state.checkpoint.summaryPath}`);
      }
    }
    if (state.fixSourceRunId) {
      const findings = state.fixFindingsCount ?? 0;
      console.log(`  Fix: source ${state.fixSourceRunId} -> current ${state.currentRunId}, findings: ${findings}`);
    }
    if (state.replanSourceRunId) {
      console.log(`  Replan: requested from ${state.replanSourceRunId}`);
    }
    console.log(`  Pilot Report: ${(await pathExists(path.join(getStepDirectory(state.stepId), 'pilot-report.md'))) ? 'generated' : 'missing'}`);
  }
}
