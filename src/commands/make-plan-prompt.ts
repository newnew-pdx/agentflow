import path from 'node:path';
import { createWebPlanPrompt } from '../web-ai/web-plan-prompt.js';
import { assertInitialized } from '../workflow/step-store.js';

export async function makePlanPromptCommand(goal: string): Promise<void> {
  if (!(await assertInitialized())) {
    console.error('AgentFlow is not initialized. Run `agentflow init` first.');
    process.exitCode = 1;
    return;
  }

  try {
    const result = await createWebPlanPrompt(goal);
    console.log('Web plan prompt generated.');
    console.log(`Prompt: ${path.relative(process.cwd(), result.promptPath)}`);
    console.log(`Context pack: ${path.relative(process.cwd(), result.contextPackPath)}`);
    console.log('Copy this prompt to a Web AI or AgentChat skill. AgentFlow did not call any Web AI.');
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : 'Failed to generate web plan prompt.');
    process.exitCode = 1;
  }
}
