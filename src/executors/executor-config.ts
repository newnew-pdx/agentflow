import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathExists } from '../utils/fs.js';
import { getAgentDirectory } from '../utils/path.js';

export type CodexExecutorConfig = {
  command: string;
  args: string[];
  timeoutMs: number;
};

export type ExecutorConfig = {
  codex: CodexExecutorConfig;
};

const defaultConfig: ExecutorConfig = {
  codex: {
    command: 'codex',
    args: [],
    timeoutMs: 600_000,
  },
};

export async function readExecutorConfig(): Promise<ExecutorConfig> {
  const configPath = path.join(getAgentDirectory(), 'config.yaml');
  if (!(await pathExists(configPath))) return defaultConfig;

  const source = await readFile(configPath, 'utf8');
  return {
    codex: {
      command: readYamlScalar(source, ['executors', 'codex', 'command']) ?? defaultConfig.codex.command,
      args: readYamlStringArray(source, ['executors', 'codex', 'args']) ?? defaultConfig.codex.args,
      timeoutMs: readYamlNumber(source, ['executors', 'codex', 'timeoutMs']) ?? defaultConfig.codex.timeoutMs,
    },
  };
}

function readYamlScalar(source: string, pathSegments: string[]): string | undefined {
  const value = readYamlRawValue(source, pathSegments);
  if (value === undefined) return undefined;
  return stripQuotes(value);
}

function readYamlNumber(source: string, pathSegments: string[]): number | undefined {
  const value = readYamlRawValue(source, pathSegments);
  if (value === undefined) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function readYamlStringArray(source: string, pathSegments: string[]): string[] | undefined {
  const value = readYamlRawValue(source, pathSegments);
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  if (trimmed === '[]') return [];
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return undefined;

  const body = trimmed.slice(1, -1).trim();
  if (!body) return [];
  return body.split(',').map((item) => stripQuotes(item.trim())).filter(Boolean);
}

function readYamlRawValue(source: string, pathSegments: string[]): string | undefined {
  const lines = source.split(/\r?\n/);
  const stack: string[] = [];

  for (const line of lines) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    const match = /^(\s*)([A-Za-z0-9_-]+):(?:\s*(.*))?$/.exec(line);
    if (!match) continue;

    const indentText = match[1] ?? '';
    const key = match[2];
    if (!key) continue;

    const indent = indentText.length;
    const level = Math.floor(indent / 2);
    stack.length = level;
    stack[level] = key;

    const value = match[3]?.trim();
    if (value && arraysEqual(stack.slice(0, level + 1), pathSegments)) {
      return value;
    }
  }

  return undefined;
}

function stripQuotes(value: string): string {
  return value.replace(/^["']|["']$/g, '');
}

function arraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}
