import { z } from 'zod';
import { createdAtSchema, protocolVersionSchema, runIdSchema, stepIdSchema } from './common.js';

export const taskPacketSchema = z.object({
  protocolVersion: protocolVersionSchema,
  stepId: stepIdSchema,
  runId: runIdSchema.optional(),
  goal: z.string().trim().min(1, 'goal must not be empty.'),
  background: z.string().optional(),
  scope: z.array(z.string()).min(1, 'scope must contain at least one item.'),
  outOfScope: z.array(z.string()),
  contextFiles: z.array(z.string()),
  constraints: z.array(z.string()),
  acceptanceCommands: z.array(z.string()),
  requiresApproval: z.boolean(),
  createdAt: createdAtSchema,
}).strict();

export type TaskPacket = z.infer<typeof taskPacketSchema>;
