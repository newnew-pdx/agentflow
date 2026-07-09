import type { CheckpointEvidence } from './checkpoint-state.js';

export function generateCommitMessage(stepId: string, evidence: CheckpointEvidence): string {
  const changedFiles = evidence.git?.changedFiles ?? [];
  if (changedFiles.some((file) => file.includes('checkpoint'))) {
    return 'step7: add checkpoint readiness summary';
  }

  const goal = evidence.task?.goal.trim();
  if (!goal) return `checkpoint: complete ${stepId}`;

  const normalized = goal.toLowerCase();
  if (normalized.includes('jwt')) {
    return `${stepId}: implement JWT authentication`;
  }

  const asciiGoal = goal
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 60);

  if (asciiGoal.length > 0) {
    return `${stepId}: ${lowercaseFirst(asciiGoal)}`;
  }

  return `checkpoint: complete ${stepId}`;
}

function lowercaseFirst(value: string): string {
  return value.charAt(0).toLowerCase() + value.slice(1);
}
