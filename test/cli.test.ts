import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import test from 'node:test';
import path from 'node:path';
import { runCli } from './helpers/cli.js';
import {
  createTemporaryGitRepositoryFixture,
  withTemporaryDirectory,
  withTemporaryGitRepository,
} from './helpers/fixtures.js';

test('compiled CLI --help succeeds from an explicit temporary cwd', async () => {
  await withTemporaryDirectory(async (fixture) => {
    const result = await runCli({ args: ['--help'], cwd: fixture.directory, env: fixture.environment });

    assert.equal(result.spawnError, undefined);
    assert.equal(result.timedOut, false);
    assert.equal(result.exitCode, 0, result.stderr);
    assert.match(result.stdout, /Usage: agentflow/);
    assert.match(result.stdout, /Initialize an AgentFlow workspace/);
  });
});

test('temporary Git repository fixture uses local identity and creates an initial commit', async () => {
  let repositoryDirectory = '';
  const initialCommit = await withTemporaryGitRepository(async (fixture) => {
    repositoryDirectory = fixture.directory;
    assert.match(fixture.initialCommit, /^[0-9a-f]{40}$/);

    const name = await fixture.git(['config', '--local', '--get', 'user.name']);
    const email = await fixture.git(['config', '--local', '--get', 'user.email']);
    const status = await fixture.git(['status', '--porcelain']);

    assert.equal(name.exitCode, 0, name.stderr);
    assert.equal(email.exitCode, 0, email.stderr);
    assert.equal(status.exitCode, 0, status.stderr);
    assert.equal(name.stdout.trim(), 'AgentFlow Test');
    assert.equal(email.stdout.trim(), 'agentflow-test@example.invalid');
    assert.equal(status.stdout, '');
    return fixture.initialCommit;
  });

  assert.match(initialCommit, /^[0-9a-f]{40}$/);
  await assert.rejects(access(repositoryDirectory));
});

test('temporary directory fixture cleans up when the test callback throws', async () => {
  let directory = '';
  await assert.rejects(
    withTemporaryDirectory(async (fixture) => {
      directory = fixture.directory;
      throw new Error('intentional fixture failure');
    }),
    /intentional fixture failure/,
  );
  await assert.rejects(access(directory));
});

test('CLI init writes AgentFlow state only inside its explicit temporary cwd', async () => {
  await withTemporaryDirectory(async (fixture) => {
    const result = await runCli({ args: ['init'], cwd: fixture.directory, env: fixture.environment });
    const configPath = path.join(fixture.agentDirectory, 'config.yaml');

    assert.equal(result.exitCode, 0, result.stderr);
    assert.match(result.stdout, /already initialized/);
    await access(configPath);
    assert.equal(path.relative(fixture.directory, configPath).startsWith('..'), false);
  });
});

test('Git fixture cleanup is available to callers that use try/finally directly', async () => {
  const fixture = await createTemporaryGitRepositoryFixture();
  const directory = fixture.directory;
  try {
    const head = await fixture.git(['rev-parse', '--verify', 'HEAD']);
    assert.equal(head.exitCode, 0, head.stderr);
  } finally {
    await fixture.cleanup();
  }
  await assert.rejects(access(directory));
});
