import path from 'node:path';
import { pathExists } from '../utils/fs.js';
import { readExecutorConfig } from '../executors/executor-config.js';
import { CodexCliExecutor } from '../executors/codex-cli-executor.js';
import { DryRunExecutor } from '../executors/dry-run-executor.js';
import { ManualExecutor } from '../executors/manual-executor.js';
import {
  updateStateWithExecutorRun,
  writeExecutorRunRecord,
} from '../executors/executor-run-store.js';
import type { Executor, ExecutorInput, ExecutorName } from '../executors/executor.js';
import {
  assertInitialized,
  getExecutionPromptPath,
  getRunDirectory,
  getTaskPacketPath,
  readStepState,
} from '../workflow/step-store.js';

export type RunExecutorOptions = {
  executor?: ExecutorName;
  confirm?: boolean;
};

export async function runExecutorCommand(stepId: string, options: RunExecutorOptions = {}): Promise<void> {
  if (!(await assertInitialized())) {
    console.error('AgentFlow is not initialized. Run `agentflow init` first.');
    process.exitCode = 1;
    return;
  }

  const state = await readStepState(stepId);
  if (!state) {
    console.error(`Step ${stepId} not found.`);
    process.exitCode = 1;
    return;
  }

  const executorName = options.executor ?? 'dry-run';
  if (!isExecutorName(executorName)) {
    console.error(`Unknown executor: ${executorName}`);
    console.error('Supported executors: dry-run, manual, codex');
    process.exitCode = 1;
    return;
  }

  if (executorName === 'codex' && options.confirm !== true) {
    console.error('Codex executor requires explicit confirmation.');
    console.error();
    console.error('Run:');
    console.error(`npm run dev -- run-executor ${stepId} --executor codex --confirm`);
    process.exitCode = 1;
    return;
  }

  const runId = state.currentRunId;
  const runDir = getRunDirectory(stepId, runId);
  const taskPath = getTaskPacketPath(stepId, runId);
  const executionRequestPath = getExecutionPromptPath(stepId, runId);

  if (!(await pathExists(taskPath))) {
    console.error(`TaskPacket is missing: ${toRelativePath(taskPath)}`);
    process.exitCode = 1;
    return;
  }

  if (!(await pathExists(executionRequestPath))) {
    console.error('Execution request is missing.');
    console.error('Run:');
    console.error(`npm run dev -- make-execute-prompt ${stepId}`);
    process.exitCode = 1;
    return;
  }

  const config = await readExecutorConfig();
  const timeoutMs = executorName === 'codex' ? config.codex.timeoutMs : 60_000;
  const input: ExecutorInput = {
    stepId,
    runId,
    projectRoot: process.cwd(),
    taskPath,
    executionRequestPath,
    executorRunPath: path.join(runDir, 'executor-run.json'),
    rawOutputPath: path.join(runDir, 'executor-output.md'),
    candidateOutputPath: path.join(runDir, 'execution-result.candidate.md'),
    timeoutMs,
    confirmed: executorName === 'codex' ? options.confirm === true : undefined,
  };

  const executor = createExecutor(executorName, config);
  const result = await executor.execute(input);
  const record = await writeExecutorRunRecord(input, result);
  await updateStateWithExecutorRun(state, record);

  console.log(`Executor: ${record.executor}, ${record.status}`);
  console.log(`Run record: ${toRelativePath(input.executorRunPath)}`);
  console.log(`Output: ${toRelativePath(input.rawOutputPath)}`);
  if (record.warnings.length > 0) {
    console.log();
    console.log('Warnings:');
    for (const warning of record.warnings) {
      console.log(`- ${warning}`);
    }
  }

  console.log();
  console.log('Next:');
  if (record.status === 'failed') {
    console.log(`1. Inspect ${toRelativePath(input.rawOutputPath)}.`);
    console.log(`2. Fix executor configuration or run manually.`);
  } else {
    console.log(`1. npm run dev -- import-candidate ${toRelativePath(input.rawOutputPath)}`);
    console.log(`2. npm run dev -- verify ${stepId}`);
    console.log(`3. npm run dev -- git-check ${stepId}`);
  }
}

function createExecutor(executorName: ExecutorName, config: Awaited<ReturnType<typeof readExecutorConfig>>): Executor {
  if (executorName === 'manual') return new ManualExecutor();
  if (executorName === 'codex') return new CodexCliExecutor(config.codex);
  return new DryRunExecutor();
}

function isExecutorName(value: string): value is ExecutorName {
  return value === 'dry-run' || value === 'manual' || value === 'codex';
}

function toRelativePath(targetPath: string): string {
  return path.relative(process.cwd(), targetPath).replace(/\\/g, '/');
}
