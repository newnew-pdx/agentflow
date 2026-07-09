import { PROTOCOL_VERSION, taskPacketSchema, type TaskPacket } from '../protocols/index.js';

export type WebPlanCandidate = {
  goal?: unknown;
  background?: unknown;
  scope?: unknown;
  outOfScope?: unknown;
  contextFiles?: unknown;
  constraints?: unknown;
  acceptanceCommands?: unknown;
  requiresApproval?: unknown;
};

export function normalizeTaskPacketCandidate(input: {
  candidate: WebPlanCandidate;
  stepId: string;
  runId: string;
  createdAt: string;
}): TaskPacket {
  const candidate = input.candidate;

  return taskPacketSchema.parse({
    protocolVersion: PROTOCOL_VERSION,
    stepId: input.stepId,
    runId: input.runId,
    goal: asString(candidate.goal),
    background: asOptionalString(candidate.background),
    scope: asStringArray(candidate.scope),
    outOfScope: asStringArray(candidate.outOfScope),
    contextFiles: withDefault(asStringArray(candidate.contextFiles), ['.agent/generated/context-pack.md']),
    constraints: asStringArray(candidate.constraints),
    acceptanceCommands: withDefault(asStringArray(candidate.acceptanceCommands), ['npm run build']),
    requiresApproval: typeof candidate.requiresApproval === 'boolean' ? candidate.requiresApproval : true,
    createdAt: input.createdAt,
  });
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function asOptionalString(value: unknown): string | undefined {
  const text = asString(value);
  return text.length > 0 ? text : undefined;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function withDefault(value: string[], fallback: string[]): string[] {
  return value.length > 0 ? value : fallback;
}
