import { z } from 'zod';
import {
  createdAtSchema,
  protocolVersionSchema,
  runIdSchema,
  severitySchema,
  stepIdSchema,
} from './common.js';

// review 的结论会直接影响流程走向：提交、返修、重规划，或转人工处理。
export const reviewVerdictSchema = z.enum([
  'approved',
  'changes_required',
  'replan_required',
  'rejected',
]);
export const reviewNextActionSchema = z.enum(['commit', 'fix', 'replan', 'manual']);

// finding 是 review 发现的单个问题，尽量写成可执行的修复项，而不是泛泛评价。
export const reviewFindingSchema = z.object({
  severity: severitySchema,
  file: z.string().optional(),
  problem: z.string().trim().min(1, 'finding problem must not be empty.'),
  requiredFix: z.string().optional(),
}).strict();

// ReviewResult 是 review 阶段交回流程控制器的“质检单”。
// 后续自动化可以根据 verdict 和 suggestedNextAction 决定是否进入修复循环。
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
