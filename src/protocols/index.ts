import { z } from 'zod';

/**
 * Step0 keeps protocol validation intentionally small while establishing
 * the location for future TaskPacket and result schemas.
 */
export const planningRequestSchema = z.object({
  goal: z.string().trim().min(1, 'A planning goal is required.'),
});

export type PlanningRequestInput = z.infer<typeof planningRequestSchema>;
