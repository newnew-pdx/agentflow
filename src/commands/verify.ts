import path from 'node:path';
import { ZodError } from 'zod';
import { pathExists } from '../utils/fs.js';
import { getAgentDirectory } from '../utils/path.js';
import { verifyStep } from '../verifier/verifier.js';

export async function verifyCommand(stepId: string): Promise<void> {
  if (!(await pathExists(getAgentDirectory()))) {
    console.error('AgentFlow is not initialized. Run `agentflow init` first.');
    process.exitCode = 1;
    return;
  }

  try {
    const verified = await verifyStep(stepId);
    if (!verified) {
      console.error(`Step ${stepId} not found.`);
      process.exitCode = 1;
      return;
    }

    const { result, stateStatus } = verified;
    if (result.status === 'skipped') {
      console.log('No acceptance commands found. Verification skipped.');
    }

    console.log(`Verification finished for ${stepId} / ${result.runId}`);
    console.log(`Commands: ${result.summary.total}`);
    console.log(`Passed: ${result.summary.passed}`);
    console.log(`Failed: ${result.summary.failed}`);
    console.log(`Result: ${stateStatus}`);
  } catch (error: unknown) {
    if (error instanceof ZodError) {
      console.error('TaskPacket validation failed.');
      for (const issue of error.issues) {
        const issuePath = issue.path.length === 0 ? '<root>' : issue.path.map(String).join('.');
        console.error(`- ${issuePath}: ${issue.message}`);
      }
    } else if (isNodeError(error) && error.code === 'ENOENT') {
      console.error(`TaskPacket not found for ${stepId}.`);
    } else {
      console.error(error instanceof Error ? error.message : 'Verification failed.');
    }
    console.error(`Working directory: ${path.relative(process.cwd(), process.cwd()) || '.'}`);
    process.exitCode = 1;
  }
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
