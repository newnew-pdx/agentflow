import path from 'node:path';
import { ZodError } from 'zod';
import { importWebPlan, formatZodIssues } from '../web-ai/web-plan-importer.js';
import { assertInitialized } from '../workflow/step-store.js';

export async function importWebPlanCommand(file: string): Promise<void> {
  if (!(await assertInitialized())) {
    console.error('AgentFlow is not initialized. Run `agentflow init` first.');
    process.exitCode = 1;
    return;
  }

  try {
    const result = await importWebPlan(file);

    console.log(`Imported web plan as ${result.stepId} / ${result.runId}.`);
    console.log(`Parser: ${result.parseSource}`);
    console.log(`TaskPacket: ${path.relative(process.cwd(), result.taskPath)}`);
    console.log('Next action:');
    console.log(`npm run dev -- validate .agent/steps/${result.stepId}/runs/${result.runId}/task.json`);
    console.log(`npm run dev -- approve ${result.stepId}`);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      console.error('TaskPacket validation failed. Web plan was not imported.');
      for (const issue of formatZodIssues(error)) {
        console.error(issue);
      }
    } else if (isNodeError(error) && error.code === 'ENOENT') {
      console.error(`file not found: ${file}`);
    } else if (error instanceof SyntaxError) {
      console.error(`JSON parse failed: ${error.message}`);
    } else {
      console.error(error instanceof Error ? error.message : 'Failed to import web plan.');
    }
    process.exitCode = 1;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
