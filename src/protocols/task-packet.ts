import { z } from 'zod';
import { createdAtSchema, protocolVersionSchema, runIdSchema, stepIdSchema } from './common.js';

// TaskPacket 是 plan 阶段交给 execute 阶段的“任务交接单”。
// 它把自然语言目标压成结构化边界，降低执行 Agent 理解跑偏的概率。
export const taskPacketSchema = z.object({
  protocolVersion: protocolVersionSchema,
  stepId: stepIdSchema,
  runId: runIdSchema.optional(),
  goal: z.string().trim().min(1, 'goal must not be empty.'),
  background: z.string().optional(),
  // scope 是本次必须覆盖的工作范围；为空时执行 Agent 没有可靠的落点。
  scope: z.array(z.string()).min(1, 'scope must contain at least one item.'),
  // outOfScope 明确“不做什么”，比只写目标更能防止任务扩张。
  outOfScope: z.array(z.string()),
  // contextFiles 只记录路径，不直接嵌入文件内容；后续可由 context pack 负责装载上下文。
  contextFiles: z.array(z.string()),
  constraints: z.array(z.string()),
  acceptanceCommands: z.array(z.string()),
  // true 表示执行前需要人工确认，适合破坏性操作或不确定性较高的任务。
  requiresApproval: z.boolean(),
  createdAt: createdAtSchema,
}).strict();

export type TaskPacket = z.infer<typeof taskPacketSchema>;
