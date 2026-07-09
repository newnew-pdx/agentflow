import path from 'node:path';
import { createExecutionPrompt } from '../executor/execution-prompt.js';
import { assertInitialized } from '../workflow/step-store.js';

export async function makeExecutePromptCommand(stepId: string): Promise<void> {
  if (!(await assertInitialized())) {
    console.error('AgentFlow is not initialized. Run `agentflow init` first.');
    process.exitCode = 1;
    return;
  }

  try {
    const result = await createExecutionPrompt(stepId);
    if (!result) {
      console.error(`Step ${stepId} not found.`);
      process.exitCode = 1;
      return;
    }

    console.log('Execution prompt generated:');
    console.log(path.relative(process.cwd(), result.promptPath));
    console.log();
    console.log('Next:');
    console.log('1. Copy this prompt to Cursor/Codex/Claude Code.');
    console.log('2. Let the executor complete the task.');
    console.log('3. Save its ExecutionResult JSON.');
    console.log('4. Run agentflow import-result <file>.');
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : 'Failed to generate execution prompt.');
    process.exitCode = 1;
  }
}
