import { spawn } from 'node:child_process';
import path from 'node:path';
import { getRunDirectory, readStepState, writeJson, writeStepState, writeText } from '../workflow/step-store.js';
import type { GitEvidence } from './git-evidence.js';

export async function collectGitEvidence(stepId: string, cwd: string = process.cwd()): Promise<GitEvidence | undefined> {
  const state = await readStepState(stepId);
  if (!state) return undefined;

  const runId = state.currentRunId;
  const createdAt = new Date().toISOString();
  const isGitRepository = (await runGit(['rev-parse', '--is-inside-work-tree'], cwd)).exitCode === 0;

  if (!isGitRepository) {
    const evidence: GitEvidence = {
      stepId,
      runId,
      createdAt,
      isGitRepository: false,
      hasUncommittedChanges: false,
      changedFiles: [],
      statusShort: '',
      diffStat: '',
      safety: { sensitiveFilesDetected: [], warnings: [] },
    };
    await persistGitEvidence(stepId, runId, evidence, state);
    return evidence;
  }

  const [branch, statusShort, diffNames, diffStat] = await Promise.all([
    runGitText(['branch', '--show-current'], cwd),
    runGitText(['status', '--short'], cwd),
    runGitText(['diff', '--name-only'], cwd),
    runGitText(['diff', '--stat'], cwd),
  ]);

  const changedFiles = collectChangedFiles(statusShort, diffNames);
  const sensitiveFiles = changedFiles.filter(isSensitivePath);
  const warnings = sensitiveFiles.map((file) => `Sensitive file path detected; diff content omitted from patch: ${file}`);
  const safeFiles = changedFiles.filter((file) => !isSensitivePath(file));
  const patch = safeFiles.length > 0 ? await runGitText(['diff', '--', ...safeFiles], cwd) : '';
  const diffPatchPath = path.join(getRunDirectory(stepId, runId), 'git-diff.patch');

  if (patch.length > 0) {
    await writeText(diffPatchPath, patch);
  }

  const evidence: GitEvidence = {
    stepId,
    runId,
    createdAt,
    isGitRepository: true,
    branch: branch.trim(),
    hasUncommittedChanges: statusShort.trim().length > 0,
    changedFiles,
    statusShort,
    diffStat,
    diffPatchPath: patch.length > 0 ? path.relative(cwd, diffPatchPath) : undefined,
    safety: {
      sensitiveFilesDetected: sensitiveFiles,
      warnings,
    },
  };

  await persistGitEvidence(stepId, runId, evidence, state);
  return evidence;
}

function collectChangedFiles(statusShort: string, diffNames: string): string[] {
  const files = new Set<string>();

  for (const line of diffNames.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (trimmed) files.add(normalizeGitPath(trimmed));
  }

  for (const line of statusShort.split(/\r?\n/)) {
    const pathPart = parseStatusPath(line);
    if (pathPart) files.add(normalizeGitPath(pathPart));
  }

  return [...files].sort();
}

function parseStatusPath(line: string): string | undefined {
  if (line.trim().length === 0) return undefined;
  const rawPath = line.slice(3).trim();
  if (!rawPath) return undefined;
  const renameParts = rawPath.split(' -> ');
  return renameParts[renameParts.length - 1];
}

function normalizeGitPath(filePath: string): string {
  return filePath.replace(/\\/g, '/').replace(/^"|"$/g, '');
}

export function isSensitivePath(filePath: string): boolean {
  const normalized = normalizeGitPath(filePath).toLowerCase();
  const base = path.posix.basename(normalized);
  return (
    base === '.env' ||
    base.startsWith('.env.') ||
    base === 'id_rsa' ||
    base === 'id_ed25519' ||
    normalized.endsWith('.pem') ||
    normalized.endsWith('.key') ||
    normalized.endsWith('.p12') ||
    normalized.endsWith('.jks')
  );
}

async function persistGitEvidence(
  stepId: string,
  runId: string,
  evidence: GitEvidence,
  state: NonNullable<Awaited<ReturnType<typeof readStepState>>>,
): Promise<void> {
  const now = new Date().toISOString();
  await writeJson(path.join(getRunDirectory(stepId, runId), 'git.json'), evidence);
  await writeStepState(stepId, {
    ...state,
    updatedAt: now,
    gitCheck: {
      checkedAt: now,
      branch: evidence.branch,
      changedFilesCount: evidence.changedFiles.length,
      hasUncommittedChanges: evidence.hasUncommittedChanges,
      sensitiveWarnings: evidence.safety.warnings,
    },
  });
}

async function runGitText(args: string[], cwd: string): Promise<string> {
  const result = await runGit(args, cwd);
  return result.stdout;
}

function runGit(args: string[], cwd: string): Promise<{ exitCode: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    const child = spawn('git', args, { cwd, windowsHide: true });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk: Buffer) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8');
    });
    child.on('error', (error) => {
      resolve({ exitCode: 1, stdout, stderr: stderr + error.message });
    });
    child.on('close', (code) => {
      resolve({ exitCode: code ?? 1, stdout, stderr });
    });
  });
}
