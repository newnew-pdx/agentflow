import { z } from 'zod';

export const PROTOCOL_VERSION = 'agentflow.v1' as const;
export const protocolVersionSchema = z.literal(PROTOCOL_VERSION);
export const stepIdSchema = z.string().regex(/^S\d{3}$/, 'stepId must match the format S001.');
export const runIdSchema = z.string().regex(/^R\d{3,}$/, 'runId must match the format R001.');
export const createdAtSchema = z.iso.datetime({ offset: true });
export const severitySchema = z.enum(['low', 'medium', 'high', 'critical']);

export type Severity = z.infer<typeof severitySchema>;
