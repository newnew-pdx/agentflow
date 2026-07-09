import { executionResultSchema, type ExecutionResult } from '../protocols/execution-result.js';
import { reviewResultSchema, type ReviewResult } from '../protocols/review-result.js';
import { taskPacketSchema } from '../protocols/task-packet.js';

export type CandidateType = 'ExecutionResult' | 'ReviewResult' | 'TaskPacket' | 'unknown';

export type ValidationIssue = {
  path: string;
  message: string;
};

export type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; issues: ValidationIssue[] };

export function detectCandidateType(value: unknown): CandidateType {
  if (!isRecord(value)) return 'unknown';

  if ('status' in value && 'filesChanged' in value) return 'ExecutionResult';
  if ('verdict' in value && 'findings' in value) return 'ReviewResult';
  if ('goal' in value && 'scope' in value) return 'TaskPacket';

  if (executionResultSchema.safeParse(value).success) return 'ExecutionResult';
  if (reviewResultSchema.safeParse(value).success) return 'ReviewResult';
  if (taskPacketSchema.safeParse(value).success) return 'TaskPacket';

  return 'unknown';
}

export function scoreAgentFlowCandidate(value: unknown): number {
  if (!isRecord(value)) return 0;

  let score = 0;
  if (value.protocolVersion === 'agentflow.v1') score += 4;
  if (typeof value.stepId === 'string') score += 2;
  if (typeof value.runId === 'string') score += 2;

  switch (detectCandidateType(value)) {
    case 'ExecutionResult':
      return score + 10;
    case 'ReviewResult':
      return score + 10;
    case 'TaskPacket':
      return score + 8;
    default:
      return score;
  }
}

export function parseExecutionResultCandidate(value: unknown): ValidationResult<ExecutionResult> {
  const result = executionResultSchema.safeParse(value);
  return result.success ? { ok: true, data: result.data } : { ok: false, issues: formatIssues(result.error.issues) };
}

export function parseReviewResultCandidate(value: unknown): ValidationResult<ReviewResult> {
  const result = reviewResultSchema.safeParse(value);
  return result.success ? { ok: true, data: result.data } : { ok: false, issues: formatIssues(result.error.issues) };
}

function formatIssues(issues: { path: PropertyKey[]; message: string }[]): ValidationIssue[] {
  return issues.map((issue) => ({
    path: issue.path.length === 0 ? '<root>' : issue.path.map(String).join('.'),
    message: issue.message,
  }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
