export type GitSafety = {
  sensitiveFilesDetected: string[];
  warnings: string[];
};

export type GitEvidence = {
  stepId: string;
  runId: string;
  createdAt: string;
  isGitRepository: boolean;
  branch?: string;
  hasUncommittedChanges: boolean;
  changedFiles: string[];
  statusShort: string;
  diffStat: string;
  diffPatchPath?: string;
  safety: GitSafety;
};
