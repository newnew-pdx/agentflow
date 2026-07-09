export const stepStatuses = [
  'DRAFT',
  'APPROVED',
  'EXPORTED',
  'RESULT_IMPORTED',
  'VERIFIED',
  'BLOCKED',
  'REVIEW_APPROVED',
  'CHANGES_REQUIRED',
  'REPLAN_REQUIRED',
  'REVIEW_REJECTED',
  'FIX_DRAFT',
  'FIX_APPROVED',
  'FIX_EXPORTED',
  'REPLAN_DRAFT',
  'CHECKPOINT_READY',
  'CHECKPOINT_BLOCKED',
  'COMPLETED',
] as const;

export type StepStatus = (typeof stepStatuses)[number];

export type StepExecutionSummary = {
  status: 'completed' | 'failed' | 'blocked';
  suggestedNextAction: 'review' | 'fix' | 'replan' | 'manual';
  filesChangedCount: number;
};

export type StepReviewSummary = {
  verdict: 'approved' | 'changes_required' | 'replan_required' | 'rejected';
  reviewedAt: string;
  findingsCount: number;
  highestSeverity: 'low' | 'medium' | 'high' | 'critical' | null;
  suggestedNextAction: 'commit' | 'fix' | 'replan' | 'manual';
  summary: string;
};

export type StepCheckpointSummary = {
  status: 'ready' | 'blocked' | 'warning';
  checkedAt: string;
  runId: string;
  summaryPath: string;
  commitMessagePath: string;
  blockingReasons: string[];
  warnings: string[];
};

export type StepExecutorRunSummary = {
  executor: string;
  status: 'completed' | 'failed' | 'blocked';
  runAt: string;
  rawOutputPath: string;
  exitCode?: number;
  timedOut?: boolean;
  warnings: string[];
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
  review?: StepReviewSummary;
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
  previousRunId?: string;
  fixCreatedAt?: string;
  fixSourceRunId?: string;
  fixFindingsCount?: number;
  replanRequestedAt?: string;
  replanSourceRunId?: string;
  checkpoint?: StepCheckpointSummary;
  executorRun?: StepExecutorRunSummary;
};

export function isStepStatus(value: unknown): value is StepStatus {
  return typeof value === 'string' && stepStatuses.includes(value as StepStatus);
}
