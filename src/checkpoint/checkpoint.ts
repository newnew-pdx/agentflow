import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathExists } from '../utils/fs.js';
import {
  getRunDirectory,
  getStepDirectory,
  readStepState,
  writeStepState,
  writeText,
} from '../workflow/step-store.js';
import type { GitEvidence } from '../git/git-evidence.js';
import type { ReviewResult } from '../protocols/review-result.js';
import type { TaskPacket } from '../protocols/task-packet.js';
import type { VerificationResult } from '../verifier/verification-result.js';
import { generateCheckpointSummary } from './checkpoint-summary.js';
import { decideCheckpoint, type CheckpointEvidence } from './checkpoint-state.js';
import { generateCommitMessage } from './commit-message.js';

export type CheckpointResult = {
  stepId: string;
  runId: string;
  status: 'ready' | 'blocked' | 'warning';
  summaryPath: string;
  commitMessagePath: string;
  commitMessage: string;
  blockingReasons: string[];
  warnings: string[];
};

export async function createCheckpoint(stepId: string, cwd: string = process.cwd()): Promise<CheckpointResult | undefined> {
  const state = await readStepState(stepId);
  if (!state) return undefined;

  const stepDir = getStepDirectory(stepId);
  if (!(await pathExists(stepDir))) return undefined;

  const runId = state.currentRunId;
  const runDir = getRunDirectory(stepId, runId);
  if (!(await pathExists(runDir))) {
    throw new Error(`Run directory not found: ${path.relative(cwd, runDir)}`);
  }

  const evidence = await readCheckpointEvidence(runDir);
  const decision = decideCheckpoint(evidence);
  const checkedAt = new Date().toISOString();
  const commitMessage = generateCommitMessage(stepId, evidence);
  const summaryPath = path.join(runDir, 'checkpoint-summary.md');
  const commitMessagePath = path.join(runDir, 'commit-message.txt');

  await writeText(
    summaryPath,
    generateCheckpointSummary({
      stepId,
      runId,
      checkedAt,
      decision,
      evidence,
      commitMessage,
    }),
  );
  await writeText(commitMessagePath, `${commitMessage}\n`);

  await writeStepState(stepId, {
    ...state,
    status: decision.status === 'ready' ? 'CHECKPOINT_READY' : decision.status === 'blocked' ? 'CHECKPOINT_BLOCKED' : state.status,
    updatedAt: checkedAt,
    checkpoint: {
      status: decision.status,
      checkedAt,
      runId,
      summaryPath: toRelativePath(summaryPath, cwd),
      commitMessagePath: toRelativePath(commitMessagePath, cwd),
      blockingReasons: decision.blockingReasons,
      warnings: decision.warnings,
    },
  });

  return {
    stepId,
    runId,
    status: decision.status,
    summaryPath: toRelativePath(summaryPath, cwd),
    commitMessagePath: toRelativePath(commitMessagePath, cwd),
    commitMessage,
    blockingReasons: decision.blockingReasons,
    warnings: decision.warnings,
  };
}

async function readCheckpointEvidence(runDir: string): Promise<CheckpointEvidence> {
  const missingItems: string[] = [];
  const readWarnings: string[] = [];

  const [task, tests, git, review, reviewSummary] = await Promise.all([
    readOptionalJson<TaskPacket>(path.join(runDir, 'task.json'), 'task.json', missingItems, readWarnings),
    readOptionalJson<VerificationResult>(path.join(runDir, 'tests.json'), 'tests.json', missingItems, readWarnings),
    readOptionalJson<GitEvidence>(path.join(runDir, 'git.json'), 'git.json', missingItems, readWarnings),
    readOptionalJson<ReviewResult>(path.join(runDir, 'review.json'), 'review.json', missingItems, readWarnings),
    readOptionalText(path.join(runDir, 'review-summary.md'), 'review-summary.md', missingItems, readWarnings),
  ]);

  return { task, tests, git, review, reviewSummary, missingItems, readWarnings };
}

async function readOptionalJson<T>(
  targetPath: string,
  label: string,
  missingItems: string[],
  readWarnings: string[],
): Promise<T | undefined> {
  try {
    return JSON.parse(await readFile(targetPath, 'utf8')) as T;
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      missingItems.push(label);
      return undefined;
    }
    const reason = error instanceof Error ? error.message : 'unknown parse error';
    readWarnings.push(`${label} could not be read: ${reason}`);
    return undefined;
  }
}

async function readOptionalText(
  targetPath: string,
  label: string,
  missingItems: string[],
  readWarnings: string[],
): Promise<string | undefined> {
  try {
    return await readFile(targetPath, 'utf8');
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      missingItems.push(label);
      return undefined;
    }
    const reason = error instanceof Error ? error.message : 'unknown read error';
    readWarnings.push(`${label} could not be read: ${reason}`);
    return undefined;
  }
}

function toRelativePath(targetPath: string, cwd: string): string {
  return path.relative(cwd, targetPath).replace(/\\/g, '/');
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
