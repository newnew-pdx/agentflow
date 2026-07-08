import { readReviewResult, readReviewSummary } from '../review/review-store.js';
import { readStepState } from '../workflow/step-store.js';

export async function showReviewCommand(stepId: string): Promise<void> {
  const state = await readStepState(stepId);
  if (!state) {
    console.error(`Step ${stepId} not found.`);
    process.exitCode = 1;
    return;
  }

  const runId = state.currentRunId;
  const summary = await readReviewSummary(stepId, runId);
  if (summary) {
    console.log(summary.trimEnd());
    return;
  }

  const review = await readReviewResult(stepId, runId);
  if (!review) {
    console.log(`No review found for ${stepId} / ${runId}.`);
    return;
  }

  console.log(`Step ID: ${review.stepId}`);
  console.log(`Run ID: ${review.runId}`);
  console.log(`Verdict: ${review.verdict}`);
  console.log(`Suggested Next Action: ${review.suggestedNextAction}`);
  console.log(`Summary: ${review.summary}`);
  console.log(`Findings: ${review.findings.length}`);
  for (const [index, finding] of review.findings.entries()) {
    console.log(`${index + 1}. ${finding.severity}`);
    console.log(`   File: ${finding.file || 'N/A'}`);
    console.log(`   Problem: ${finding.problem}`);
    console.log(`   Required Fix: ${finding.requiredFix || 'N/A'}`);
  }
}
