import { pathExists } from '../utils/fs.js';
import { getAgentDirectory } from '../utils/path.js';
import { createCheckpoint } from '../checkpoint/checkpoint.js';

export async function checkpointCommand(stepId: string): Promise<void> {
  if (!(await pathExists(getAgentDirectory()))) {
    console.error('AgentFlow is not initialized. Run `agentflow init` first.');
    process.exitCode = 1;
    return;
  }

  try {
    const result = await createCheckpoint(stepId);
    if (!result) {
      console.error(`Step ${stepId} not found.`);
      process.exitCode = 1;
      return;
    }

    if (result.status === 'ready') {
      console.log(`Checkpoint ready for ${result.stepId} / ${result.runId}.`);
      console.log('Suggested commit message:');
      console.log(result.commitMessage);
    } else if (result.status === 'blocked') {
      console.log(`Checkpoint blocked for ${result.stepId} / ${result.runId}.`);
      console.log('Reasons:');
      for (const reason of result.blockingReasons) {
        console.log(`- ${reason}`);
      }
    } else {
      console.log(`Checkpoint warning for ${result.stepId} / ${result.runId}.`);
      console.log('Warnings:');
      for (const warning of result.warnings) {
        console.log(`- ${warning}`);
      }
      console.log('Suggested commit message:');
      console.log(result.commitMessage);
    }

    console.log(`Summary: ${result.summaryPath}`);
    console.log(`Commit message: ${result.commitMessagePath}`);
    console.log('No git commit or push was executed.');
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : 'Checkpoint failed.');
    process.exitCode = 1;
  }
}
