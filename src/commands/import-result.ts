import path from 'node:path';
import { importExecutionResultData } from '../candidate/candidate-importer.js';
import { parseExecutionResultCandidate } from '../candidate/candidate-detector.js';
import { readJsonCandidateFile } from '../candidate/candidate-parser.js';

export async function importResultCommand(file: string): Promise<void> {
  const parsed = await readJsonCandidateFile(path.resolve(file), 'ExecutionResult');
  if (!parsed.ok) {
    console.error(parsed.message);
    process.exitCode = 1;
    return;
  }

  const result = parseExecutionResultCandidate(parsed.value);
  if (!result.ok) {
    console.error('ExecutionResult validation failed.');
    for (const issue of result.issues) {
      console.error(`- ${issue.path}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  const imported = await importExecutionResultData(result.data);
  if (!imported.ok) {
    console.error(imported.message);
    process.exitCode = 1;
    return;
  }

  if (imported.warning) {
    console.warn(imported.warning);
  }

  const executionResult = result.data;
  console.log(`ExecutionResult imported for ${executionResult.stepId}/${executionResult.runId}.`);
  console.log(`Summary: ${executionResult.summary}`);
  console.log(`Files changed: ${executionResult.filesChanged.length}`);
  console.log(`Suggested next action: ${executionResult.suggestedNextAction}`);
  console.log(`Saved to: ${path.relative(process.cwd(), imported.savedPath)}`);
}
