import { z } from 'zod';
import {
  createdAtSchema,
  protocolVersionSchema,
  runIdSchema,
  severitySchema,
  stepIdSchema,
} from './common.js';

export const reviewVerdictSchema = z.enum([
  'approved',
  'changes_required',
  'replan_required',
  'rejected',
]);
export const reviewNextActionSchema = z.enum(['commit', 'fix', 'replan', 'manual']);
export const reviewFindingSchema = z.object({
  severity: severitySchema,
  file: z.string().optional(),
  problem: z.string().trim().min(1, 'finding problem must not be empty.'),
  requiredFix: z.string().optional(),
}).strict();

export const reviewResultSchema = z.object({
  protocolVersion: protocolVersionSchema,
  stepId: stepIdSchema,
  runId: runIdSchema,
  verdict: reviewVerdictSchema,
  summary: z.string().trim().min(1, 'summary must not be empty.'),
  findings: z.array(reviewFindingSchema),
  suggestedNextAction: reviewNextActionSchema,
  createdAt: createdAtSchema,
}).strict();

export type ReviewFinding = z.infer<typeof reviewFindingSchema>;
export type ReviewResult = z.infer<typeof reviewResultSchema>;
