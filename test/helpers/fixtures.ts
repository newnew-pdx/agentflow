import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describeProcessFailure, runProcess, type ProcessResult } from './process.js';

const temporaryDirectoryPrefix = path.join(tmpdir(), 'agentflow-test-');
const cleanupRetries = 3;
const cleanupRetryDelayMs = 100;
const gitTimeoutMs = 10_000;

export type TemporaryDirectoryFixture = {
  directory: string;
  agentDirectory: string;
  homeDirectory: string;
  tempDirectory: string;
  environment: NodeJS.ProcessEnv;
  cleanup(): Promise<void>;
};

export async function createTemporaryDirectoryFixture(): Promise<TemporaryDirectoryFixture> {
  const directory = await mkdtemp(temporaryDirectoryPrefix);
  const agentDirectory = path.join(directory, '.agent');
  const homeDirectory = path.join(directory, 'home');
  const tempDirectory = path.join(directory, 'tmp');
  await Promise.all([mkdir(agentDirectory), mkdir(homeDirectory), mkdir(tempDirectory)]);

  return {
    directory,
    agentDirectory,
    homeDirectory,
    tempDirectory,
    environment: {
      ...process.env,
      HOME: homeDirectory,
      USERPROFILE: homeDirectory,
      TMP: tempDirectory,
      TEMP: tempDirectory,
    },
    async cleanup(): Promise<void> {
      try {
        await rm(directory, {
          recursive: true,
          force: true,
          maxRetries: cleanupRetries,
          retryDelay: cleanupRetryDelayMs,
        });
      } catch (error: unknown) {
        const reason = error instanceof Error ? error.message : String(error);
        throw new Error(`Unable to clean temporary fixture at ${directory}: ${reason}`);
      }
    },
  };
}

export async function withTemporaryDirectory<T>(
  callback: (fixture: TemporaryDirectoryFixture) => Promise<T>,
): Promise<T> {
  const fixture = await createTemporaryDirectoryFixture();
  try {
    return await callback(fixture);
  } finally {
    await fixture.cleanup();
  }
}

export type TemporaryGitRepositoryFixture = TemporaryDirectoryFixture & {
  git(args: readonly string[]): Promise<ProcessResult>;
  initialCommit: string;
};

export async function createTemporaryGitRepositoryFixture(): Promise<TemporaryGitRepositoryFixture> {
  const fixture = await createTemporaryDirectoryFixture();
  const git = async (args: readonly string[]): Promise<ProcessResult> =>
    runProcess({ command: 'git', args, cwd: fixture.directory, env: fixture.environment, timeoutMs: gitTimeoutMs });

  try {
    await assertGitSuccess(git, ['init']);
    await assertGitSuccess(git, ['config', '--local', 'user.name', 'AgentFlow Test']);
    await assertGitSuccess(git, ['config', '--local', 'user.email', 'agentflow-test@example.invalid']);
    await writeFile(path.join(fixture.directory, 'README.md'), '# Temporary AgentFlow test repository\n', 'utf8');
    await assertGitSuccess(git, ['add', 'README.md']);
    await assertGitSuccess(git, ['commit', '-m', 'test: initial fixture']);
    const commit = await assertGitSuccess(git, ['rev-parse', '--verify', 'HEAD']);

    return { ...fixture, git, initialCommit: commit.stdout.trim() };
  } catch (error) {
    await fixture.cleanup();
    throw error;
  }
}

export async function withTemporaryGitRepository<T>(
  callback: (fixture: TemporaryGitRepositoryFixture) => Promise<T>,
): Promise<T> {
  const fixture = await createTemporaryGitRepositoryFixture();
  try {
    return await callback(fixture);
  } finally {
    await fixture.cleanup();
  }
}

async function assertGitSuccess(
  git: (args: readonly string[]) => Promise<ProcessResult>,
  args: readonly string[],
): Promise<ProcessResult> {
  const result = await git(args);
  if (result.spawnError || result.timedOut || result.exitCode !== 0) {
    throw new Error(describeProcessFailure(result));
  }
  return result;
}
