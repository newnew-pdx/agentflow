export type VerificationCommandStatus = 'passed' | 'failed';
export type VerificationStatus = 'passed' | 'failed' | 'skipped';

export type VerificationCommandResult = {
  command: string;
  exitCode: number;
  status: VerificationCommandStatus;
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  stdout: string;
  stderr: string;
  truncated?: boolean;
};

export type VerificationResult = {
  stepId: string;
  runId: string;
  createdAt: string;
  status: VerificationStatus;
  commands: VerificationCommandResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
  };
};
