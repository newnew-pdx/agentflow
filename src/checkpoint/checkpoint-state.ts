import { isSensitivePath } from '../git/git-inspector.js';
import type { GitEvidence } from '../git/git-evidence.js';
import type { ReviewResult } from '../protocols/review-result.js';
import type { TaskPacket } from '../protocols/task-packet.js';
import type { VerificationResult } from '../verifier/verification-result.js';

export type CheckpointStatus = 'ready' | 'blocked' | 'warning';

export type CheckpointEvidence = {
  task?: TaskPacket;
  tests?: VerificationResult;
  git?: GitEvidence;
  review?: ReviewResult;
  reviewSummary?: string;
  missingItems: string[];
  readWarnings: string[];
};

export type CheckpointDecision = {
  status: CheckpointStatus;
  blockingReasons: string[];
  warnings: string[];
};

export function decideCheckpoint(evidence: CheckpointEvidence): CheckpointDecision {
  const blockingReasons: string[] = [];
  const warnings = [...evidence.readWarnings];

  if (!evidence.tests) {
    blockingReasons.push('Verification evidence is missing.');
  } else if (evidence.tests.status !== 'passed') {
    blockingReasons.push(`Verification is not passed: ${evidence.tests.status}.`);
  }

  if (!evidence.review) {
    blockingReasons.push('Review evidence is missing.');
  } else if (evidence.review.verdict !== 'approved') {
    blockingReasons.push(`Review is not approved: ${evidence.review.verdict}.`);
  }

  if (!evidence.git) {
    blockingReasons.push('Git evidence is missing.');
  } else {
    if (!evidence.git.isGitRepository) {
      blockingReasons.push('Current directory is not a Git repository.');
    }

    const sensitiveFiles = collectSensitiveFiles(evidence.git);
    if (sensitiveFiles.length > 0) {
      blockingReasons.push(`Sensitive file paths detected: ${sensitiveFiles.join(', ')}.`);
    }

    if (evidence.git.changedFiles.length === 0) {
      warnings.push('No changed files were found in Git evidence.');
    }
  }

  if (!evidence.task) warnings.push('Task packet is missing; goal is shown as N/A.');
  if (!evidence.reviewSummary) warnings.push('Review summary markdown is missing.');

  const status: CheckpointStatus =
    blockingReasons.length > 0 ? 'blocked' : warnings.length > 0 ? 'warning' : 'ready';

  return { status, blockingReasons, warnings };
}

function collectSensitiveFiles(git: GitEvidence): string[] {
  const files = new Set<string>();

  for (const file of git.safety.sensitiveFilesDetected) {
    files.add(file);
  }

  for (const file of git.changedFiles) {
    if (isSensitivePath(file)) files.add(file);
  }

  for (const warning of git.safety.warnings) {
    for (const file of git.changedFiles) {
      if (warning.includes(file) && isSensitivePath(file)) files.add(file);
    }
  }

  return [...files].sort();
}
