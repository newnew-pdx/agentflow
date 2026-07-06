import { z } from 'zod';
import { createdAtSchema, protocolVersionSchema, runIdSchema, stepIdSchema } from './common.js';

export const executionStatusSchema = z.enum(['completed', 'failed', 'blocked']);
export const executionNextActionSchema = z.enum(['review', 'fix', 'replan', 'manual']);
export const testResultSchema = z.object({
  command: z.string().trim().min(1, 'test command must not be empty.'),
  passed: z.number().int().nonnegative().optional(),
  failed: z.number().int().nonnegative().optional(),
  skipped: z.number().int().nonnegative().optional(),
  rawOutput: z.string().optional(),
}).strict();

export const executionResultSchema = z.object({
  protocolVersion: protocolVersionSchema,
  stepId: stepIdSchema,
  runId: runIdSchema,
  status: executionStatusSchema,
  summary: z.string().trim().min(1, 'summary must not be empty.'),
  filesChanged: z.array(z.string()),
  tests: z.array(testResultSchema),
  deviations: z.array(z.string()),
  blockers: z.array(z.string()),
  remainingRisks: z.array(z.string()),
  suggestedNextAction: executionNextActionSchema,
  createdAt: createdAtSchema,
}).strict();

export type TestResult = z.infer<typeof testResultSchema>;
export type ExecutionResult = z.infer<typeof executionResultSchema>;
