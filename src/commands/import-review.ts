import path from 'node:path';
import { parseReviewResultCandidate } from '../candidate/candidate-detector.js';
import { importReviewResultData } from '../candidate/candidate-importer.js';
import { readJsonCandidateFile } from '../candidate/candidate-parser.js';
import { assertInitialized } from '../workflow/step-store.js';

export async function importReviewCommand(file: string): Promise<void> {
  if (!(await assertInitialized())) {
    console.error('AgentFlow is not initialized. Run `agentflow init` first.');
    process.exitCode = 1;
    return;
  }

  const parsed = await readJsonCandidateFile(path.resolve(file), 'ReviewResult');
  if (!parsed.ok) {
    console.error(parsed.message);
    process.exitCode = 1;
    return;
  }

  const result = parseReviewResultCandidate(parsed.value);
  if (!result.ok) {
    console.error('ReviewResult validation failed.');
    for (const issue of result.issues) {
      console.error(`- ${issue.path}: ${issue.message}`);
    }
    process.exitCode = 1;
    return;
  }

  const imported = await importReviewResultData(result.data);
  if (!imported.ok) {
    console.error(imported.message);
    process.exitCode = 1;
    return;
  }

  if (imported.warning) {
    console.warn(imported.warning);
  }

  const review = result.data;
  console.log(`ReviewResult imported for ${review.stepId}/${review.runId}.`);
  console.log(`Verdict: ${review.verdict}`);
  console.log(`Findings: ${review.findings.length}`);
  console.log(`Suggested next action: ${review.suggestedNextAction}`);
  console.log(`Saved to: ${path.relative(process.cwd(), imported.savedPath)}`);
  if (imported.summaryPath) {
    console.log(`Summary: ${path.relative(process.cwd(), imported.summaryPath)}`);
  }
}
