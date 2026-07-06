export type ProjectStatus = 'initialized';

export interface AgentFlowConfig {
  version: 1;
  status: ProjectStatus;
}

export interface ProjectSummary {
  status: ProjectStatus;
  stepCount: number;
}

/**
 * Minimal protocol shape reserved for future planning work.
 * Step1/Step2 will replace this with a validated, versioned TaskPacket.
 */
export interface PlanningRequest {
  goal: string;
}
