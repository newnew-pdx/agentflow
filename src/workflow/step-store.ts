import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createDirectory, pathExists } from '../utils/fs.js';
import { getAgentDirectory } from '../utils/path.js';
import { isStepStatus, type StepState } from './step-state.js';

export type StepRecord = {
  state: StepState;
  stepDir: string;
};

export function getStepsDirectory(): string {
  return path.join(getAgentDirectory(), 'steps');
}

export function getStepDirectory(stepId: string): string {
  return path.join(getStepsDirectory(), stepId);
}

export function getRunDirectory(stepId: string, runId: string): string {
  return path.join(getStepDirectory(stepId), 'runs', runId);
}

export function getTaskPacketPath(stepId: string, runId: string): string {
  return path.join(getRunDirectory(stepId, runId), 'task.json');
}

export function getExecutionResultPath(stepId: string, runId: string): string {
  return path.join(getRunDirectory(stepId, runId), 'execution-result.json');
}

export async function assertInitialized(): Promise<boolean> {
  return pathExists(getAgentDirectory());
}

export async function listStepIds(): Promise<string[]> {
  try {
    const entries = await readdir(getStepsDirectory(), { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'ENOENT') return [];
    throw error;
  }
}

export async function listRunIds(stepId: string): Promise<string[]> {
  try {
    const entries = await readdir(path.join(getStepDirectory(stepId), 'runs'), { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'ENOENT') return [];
    throw error;
  }
}

export async function readStepState(stepId: string): Promise<StepState | undefined> {
  const statePath = path.join(getStepDirectory(stepId), 'state.json');
  try {
    const source = await readFile(statePath, 'utf8');
    const data = JSON.parse(source) as Partial<StepState>;
    if (!data.stepId || !data.goal || !data.currentRunId || !data.createdAt || !data.updatedAt || !isStepStatus(data.status)) {
      throw new Error(`invalid step state: ${statePath}`);
    }
    return data as StepState;
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'ENOENT') return undefined;
    throw error;
  }
}

export async function writeStepState(stepId: string, state: StepState): Promise<void> {
  await writeJson(path.join(getStepDirectory(stepId), 'state.json'), state);
}

export async function listStepRecords(): Promise<StepRecord[]> {
  const records: StepRecord[] = [];
  for (const stepId of await listStepIds()) {
    const state = await readStepState(stepId);
    if (state) {
      records.push({ state, stepDir: getStepDirectory(stepId) });
    }
  }
  return records;
}

export async function writeJson(targetPath: string, data: unknown): Promise<void> {
  await createDirectory(path.dirname(targetPath));
  await writeFile(targetPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

export async function writeText(targetPath: string, content: string): Promise<void> {
  await createDirectory(path.dirname(targetPath));
  await writeFile(targetPath, content, 'utf8');
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
