export const stepStatuses = [
  'DRAFT',
  'APPROVED',
  'EXPORTED',
  'RESULT_IMPORTED',
  'VERIFIED',
  'BLOCKED',
  'COMPLETED',
] as const;

export type StepStatus = (typeof stepStatuses)[number];

export type StepExecutionSummary = {
  status: 'completed' | 'failed' | 'blocked';
  suggestedNextAction: 'review' | 'fix' | 'replan' | 'manual';
  filesChangedCount: number;
};

export type StepState = {
  stepId: string;
  status: StepStatus;
  goal: string;
  currentRunId: string;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  exportedAt?: string;
  importedAt?: string;
  executionResult?: StepExecutionSummary;
  verification?: {
    status: 'passed' | 'failed' | 'skipped';
    verifiedAt: string;
    commands: number;
    passed: number;
    failed: number;
  };
  gitCheck?: {
    checkedAt: string;
    branch?: string;
    changedFilesCount: number;
    hasUncommittedChanges: boolean;
    sensitiveWarnings: string[];
  };
};

export function isStepStatus(value: unknown): value is StepStatus {
  return typeof value === 'string' && stepStatuses.includes(value as StepStatus);
}
