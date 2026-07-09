import path from 'node:path';
import { assertInitialized } from '../workflow/step-store.js';
import { createWebReviewPrompt } from '../web-ai/web-review-prompt.js';

export async function makeReviewPromptCommand(stepId: string): Promise<void> {
  if (!(await assertInitialized())) {
    console.error('AgentFlow is not initialized. Run `agentflow init` first.');
    process.exitCode = 1;
    return;
  }

  try {
    const result = await createWebReviewPrompt(stepId);
    if (!result) {
      console.error(`Step ${stepId} not found.`);
      process.exitCode = 1;
      return;
    }

    console.log(`Web review prompt generated for ${result.stepId} / ${result.runId}.`);
    console.log(`Prompt: ${path.relative(process.cwd(), result.promptPath)}`);
    console.log('Copy this prompt to a Web AI or AgentChat skill. AgentFlow did not call any Web AI.');
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : 'Failed to generate web review prompt.');
    process.exitCode = 1;
  }
}
