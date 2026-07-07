import { z } from 'zod';
import { createdAtSchema, protocolVersionSchema, runIdSchema, stepIdSchema } from './common.js';

// execute 阶段的状态只保留流程决策需要的三类结果。
export const executionStatusSchema = z.enum(['completed', 'failed', 'blocked']);
export const executionNextActionSchema = z.enum(['review', 'fix', 'replan', 'manual']);

// 单条测试/验收命令的结果摘要；rawOutput 可保留必要日志，但不强制塞入完整输出。
export const testResultSchema = z.object({
  command: z.string().trim().min(1, 'test command must not be empty.'),
  passed: z.number().int().nonnegative().optional(),
  failed: z.number().int().nonnegative().optional(),
  skipped: z.number().int().nonnegative().optional(),
  rawOutput: z.string().optional(),
}).strict();

// ExecutionResult 是 execute 阶段交回流程控制器/review 阶段的“执行回执”。
// 它描述做了什么、验证了什么、哪里偏离了计划，以及下一步建议。
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
