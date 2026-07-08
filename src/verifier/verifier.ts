import { readFile } from 'node:fs/promises';
import { taskPacketSchema, type TaskPacket } from '../protocols/task-packet.js';
import { getRunDirectory, getTaskPacketPath, readStepState, writeJson, writeStepState } from '../workflow/step-store.js';
import { runCommand } from './command-runner.js';
import type { VerificationResult } from './verification-result.js';

export type VerifyStepResult = {
  stateStatus: 'VERIFIED' | 'BLOCKED';
  result: VerificationResult;
};

export async function verifyStep(stepId: string, cwd: string = process.cwd()): Promise<VerifyStepResult | undefined> {
  const state = await readStepState(stepId);
  if (!state) return undefined;

  const runId = state.currentRunId;
  const taskPath = getTaskPacketPath(stepId, runId);
  const task = await readTaskPacket(taskPath);
  const commands = task.acceptanceCommands;
  const createdAt = new Date().toISOString();

  if (commands.length === 0) {
    const result: VerificationResult = {
      stepId,
      runId,
      createdAt,
      status: 'skipped',
      commands: [],
      summary: { total: 0, passed: 0, failed: 0 },
    };
    await writeVerification(stepId, runId, result, state, 'BLOCKED');
    return { stateStatus: 'BLOCKED', result };
  }

  const commandResults = [];
  for (const command of commands) {
    commandResults.push(await runCommand(command, { cwd }));
  }

  const passed = commandResults.filter((result) => result.status === 'passed').length;
  const failed = commandResults.length - passed;
  const status = failed === 0 ? 'passed' : 'failed';
  const stateStatus = status === 'passed' ? 'VERIFIED' : 'BLOCKED';
  const result: VerificationResult = {
    stepId,
    runId,
    createdAt,
    status,
    commands: commandResults,
    summary: {
      total: commandResults.length,
      passed,
      failed,
    },
  };

  await writeVerification(stepId, runId, result, state, stateStatus);
  return { stateStatus, result };
}

async function readTaskPacket(taskPath: string): Promise<TaskPacket> {
  const source = await readFile(taskPath, 'utf8');
  return taskPacketSchema.parse(JSON.parse(source));
}

async function writeVerification(
  stepId: string,
  runId: string,
  result: VerificationResult,
  state: NonNullable<Awaited<ReturnType<typeof readStepState>>>,
  stateStatus: 'VERIFIED' | 'BLOCKED',
): Promise<void> {
  const now = new Date().toISOString();
  await writeJson(getTestsPath(stepId, runId), result);
  await writeStepState(stepId, {
    ...state,
    status: stateStatus,
    updatedAt: now,
    verification: {
      status: result.status,
      verifiedAt: now,
      commands: result.summary.total,
      passed: result.summary.passed,
      failed: result.summary.failed,
    },
  });
}

export function getTestsPath(stepId: string, runId: string): string {
  return `${getRunDirectory(stepId, runId)}/tests.json`;
}
