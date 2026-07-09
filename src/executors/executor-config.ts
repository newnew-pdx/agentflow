import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathExists } from '../utils/fs.js';
import { getAgentDirectory } from '../utils/path.js';

export type CodexExecutorConfig = {
  command: string;
  args: string[];
  timeoutMs: number;
  maxOutputChars: number;
  promptMode: CodexPromptMode;
};

export type ExecutorConfig = {
  codex: CodexExecutorConfig;
};

export type CodexPromptMode = 'stdin' | 'file-reference';

const defaultConfig: ExecutorConfig = {
  codex: {
    command: 'codex',
    args: [],
    timeoutMs: 600_000,
    maxOutputChars: 50_000,
    promptMode: 'stdin',
  },
};

export async function readExecutorConfig(): Promise<ExecutorConfig> {
  const configPath = path.join(getAgentDirectory(), 'config.yaml');
  if (!(await pathExists(configPath))) return defaultConfig;

  const source = await readFile(configPath, 'utf8');
  return parseExecutorConfigSource(source);
}

export function parseExecutorConfigSource(source: string): ExecutorConfig {
  return {
    codex: {
      command: readYamlScalar(source, ['executors', 'codex', 'command']) ?? defaultConfig.codex.command,
      args: readYamlStringArray(source, ['executors', 'codex', 'args']) ?? defaultConfig.codex.args,
      timeoutMs: readYamlNumber(source, ['executors', 'codex', 'timeoutMs']) ?? defaultConfig.codex.timeoutMs,
      maxOutputChars: readYamlNumber(source, ['executors', 'codex', 'maxOutputChars']) ?? defaultConfig.codex.maxOutputChars,
      promptMode: readYamlPromptMode(source, ['executors', 'codex', 'promptMode']) ?? defaultConfig.codex.promptMode,
    },
  };
}

function readYamlPromptMode(source: string, pathSegments: string[]): CodexPromptMode | undefined {
  const value = readYamlScalar(source, pathSegments);
  return value === 'stdin' || value === 'file-reference' ? value : undefined;
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
  if (value === undefined) return readYamlBlockStringArray(source, pathSegments);
  const trimmed = value.trim();
  if (trimmed === '[]') return [];
  if (!trimmed.startsWith('[') || !trimmed.endsWith(']')) return undefined;

  const body = trimmed.slice(1, -1).trim();
  if (!body) return [];
  return splitInlineArray(body).map((item) => parseYamlStringValue(item.trim())).filter(Boolean);
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
  return parseYamlStringValue(value);
}

function readYamlBlockStringArray(source: string, pathSegments: string[]): string[] | undefined {
  const lines = source.split(/\r?\n/);
  const stack: string[] = [];
  let targetIndent: number | undefined;
  const items: string[] = [];

  for (const line of lines) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;

    const keyMatch = /^(\s*)([A-Za-z0-9_-]+):(?:\s*(.*))?$/.exec(line);
    if (keyMatch) {
      const indentText = keyMatch[1] ?? '';
      const key = keyMatch[2];
      if (!key) continue;

      const indent = indentText.length;
      if (targetIndent !== undefined && indent <= targetIndent) break;

      const level = Math.floor(indent / 2);
      stack.length = level;
      stack[level] = key;

      const value = keyMatch[3]?.trim();
      if (arraysEqual(stack.slice(0, level + 1), pathSegments) && !value) {
        targetIndent = indent;
      }
      continue;
    }

    if (targetIndent === undefined) continue;

    const itemMatch = /^(\s*)-\s*(.*)$/.exec(line);
    if (!itemMatch) continue;

    const itemIndent = (itemMatch[1] ?? '').length;
    if (itemIndent <= targetIndent) break;

    const itemValue = itemMatch[2]?.trim() ?? '';
    items.push(parseYamlStringValue(itemValue));
  }

  return targetIndent === undefined ? undefined : items.filter(Boolean);
}

function splitInlineArray(body: string): string[] {
  const items: string[] = [];
  let current = '';
  let quote: '"' | "'" | undefined;
  let escaped = false;

  for (const char of body) {
    if (escaped) {
      current += char;
      escaped = false;
      continue;
    }

    if (char === '\\' && quote === '"') {
      current += char;
      escaped = true;
      continue;
    }

    if ((char === '"' || char === "'") && quote === undefined) {
      quote = char;
      current += char;
      continue;
    }

    if (char === quote) {
      quote = undefined;
      current += char;
      continue;
    }

    if (char === ',' && quote === undefined) {
      items.push(current);
      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) items.push(current);
  return items;
}

function parseYamlStringValue(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  }
  if (trimmed.startsWith("'") && trimmed.endsWith("'")) {
    return trimmed.slice(1, -1).replace(/''/g, "'");
  }
  return trimmed;
}

function arraysEqual(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}
