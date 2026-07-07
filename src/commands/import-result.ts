import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { executionResultSchema } from '../protocols/index.js';
import { getExecutionResultPath, readStepState, writeJson, writeStepState } from '../workflow/step-store.js';

function formatPath(issuePath: PropertyKey[]): string {
  return issuePath.length === 0 ? '<root>' : issuePath.map(String).join('.');
}

export async function importResultCommand(file: string): Promise<void> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await readFile(path.resolve(file), 'utf8'));
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'unknown error';
    console.error(`ExecutionResult read failed: ${reason}`);
    process.exitCode = 1;
    return;
  }

  const result = executionResultSchema.safeParse(parsed);
  if (!result.success) {
    console.error('ExecutionResult validation failed.');
    for (const issue of result.error.issues) {
      console.error(`- ${formatPath(issue.path)}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  const executionResult = result.data;
  const state = await readStepState(executionResult.stepId);
  if (!state) {
    console.error(`Step ${executionResult.stepId} not found.`);
    process.exitCode = 1;
    return;
  }

  if (state.currentRunId !== executionResult.runId) {
    console.warn(
      `Warning: importing result for run ${executionResult.runId}, while state currentRunId is ${state.currentRunId}.`,
    );
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

  console.log(`ExecutionResult imported for ${executionResult.stepId}/${executionResult.runId}.`);
  console.log(`Summary: ${executionResult.summary}`);
  console.log(`Files changed: ${executionResult.filesChanged.length}`);
  console.log(`Suggested next action: ${executionResult.suggestedNextAction}`);
  console.log(`Saved to: ${path.relative(process.cwd(), targetPath)}`);
}
