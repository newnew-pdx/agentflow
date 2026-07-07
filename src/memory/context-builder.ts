import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { pathExists } from '../utils/fs.js';
import { getMemoryLayout, toProjectRelative, type MemoryLayout } from './memory-layout.js';
import { isSensitivePath, sensitiveFilterRules } from './sensitive-filter.js';

const execFileAsync = promisify(execFile);

interface MemoryFile {
  label: string;
  path: string;
  relativePath: string;
  content: string | null;
}

interface StepMemoryFile extends MemoryFile {
  step: string;
  kind: 'spec' | 'plan' | 'acceptance';
}

interface GitState {
  repository: boolean;
  branch: string | null;
  dirty: boolean;
  changedFiles: string[];
}

interface BuildContextResult {
  currentStatePath: string;
  contextPackPath: string;
  git: GitState;
  decisions: MemoryFile[];
  steps: StepMemoryFile[];
  skippedFiles: string[];
}

export async function buildContext(cwd: string = process.cwd()): Promise<BuildContextResult> {
  const layout = getMemoryLayout(cwd);

  if (!(await pathExists(layout.agentRoot))) {
    throw new Error('AgentFlow is not initialized. Run `agentflow init` first.');
  }

  await mkdir(layout.generatedRoot, { recursive: true });

  const skippedFiles: string[] = [];
  const [agents, readme, vision, architecture, constraints] = await Promise.all([
    readMemoryFile('AGENTS.md', layout.agents, layout, skippedFiles),
    readMemoryFile('README.md', layout.readme, layout, skippedFiles),
    readMemoryFile('.agent/project/vision.md', layout.project.vision, layout, skippedFiles),
    readMemoryFile('.agent/project/architecture.md', layout.project.architecture, layout, skippedFiles),
    readMemoryFile('.agent/project/constraints.md', layout.project.constraints, layout, skippedFiles),
  ]);

  const [decisions, steps, git] = await Promise.all([
    readDecisionFiles(layout, skippedFiles),
    readStepFiles(layout, skippedFiles),
    readGitState(layout.cwd),
  ]);

  const generatedAt = new Date().toISOString();
  const currentState = renderCurrentState({
    generatedAt,
    git,
    vision,
    architecture,
    constraints,
    decisions,
    steps,
  });
  const contextPack = renderContextPack({
    generatedAt,
    git,
    agents,
    readme,
    vision,
    architecture,
    constraints,
    decisions,
    steps,
    skippedFiles,
  });

  await writeFile(layout.generated.currentState, currentState, 'utf8');
  await writeFile(layout.generated.contextPack, contextPack, 'utf8');

  return {
    currentStatePath: layout.generated.currentState,
    contextPackPath: layout.generated.contextPack,
    git,
    decisions,
    steps,
    skippedFiles,
  };
}

async function readMemoryFile(
  label: string,
  filePath: string,
  layout: MemoryLayout,
  skippedFiles: string[],
): Promise<MemoryFile> {
  const relativePath = toProjectRelative(filePath, layout.cwd);

  if (isSensitivePath(relativePath)) {
    skippedFiles.push(relativePath);
    return { label, path: filePath, relativePath, content: null };
  }

  try {
    return {
      label,
      path: filePath,
      relativePath,
      content: await readFile(filePath, 'utf8'),
    };
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return { label, path: filePath, relativePath, content: null };
    }

    throw error;
  }
}

async function readDecisionFiles(layout: MemoryLayout, skippedFiles: string[]): Promise<MemoryFile[]> {
  const fileNames = await readMarkdownFileNames(layout.decisionsRoot);
  const files = await Promise.all(
    fileNames.map((fileName) =>
      readMemoryFile(fileName, path.join(layout.decisionsRoot, fileName), layout, skippedFiles),
    ),
  );

  return files.sort(compareByRelativePath);
}

async function readStepFiles(layout: MemoryLayout, skippedFiles: string[]): Promise<StepMemoryFile[]> {
  let stepEntries: string[];
  try {
    stepEntries = await readdir(layout.stepsRoot);
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }

  const stepFiles = await Promise.all(
    stepEntries.sort().flatMap((step) =>
      (['spec', 'plan', 'acceptance'] as const).map(async (kind) => {
        const memoryFile = await readMemoryFile(
          `${step}/${kind}.md`,
          path.join(layout.stepsRoot, step, `${kind}.md`),
          layout,
          skippedFiles,
        );
        return { ...memoryFile, step, kind };
      }),
    ),
  );

  return stepFiles
    .filter((file) => file.content !== null)
    .sort((a, b) => a.step.localeCompare(b.step) || a.kind.localeCompare(b.kind));
}

async function readMarkdownFileNames(directory: string): Promise<string[]> {
  try {
    const entries = await readdir(directory, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => entry.name)
      .sort();
  } catch (error: unknown) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }
}

async function readGitState(cwd: string): Promise<GitState> {
  try {
    const inside = (await execFileAsync('git', ['rev-parse', '--is-inside-work-tree'], { cwd })).stdout.trim();
    if (inside !== 'true') {
      return noGitState();
    }

    const [branchResult, statusResult] = await Promise.all([
      execFileAsync('git', ['branch', '--show-current'], { cwd }),
      execFileAsync('git', ['status', '--short'], { cwd }),
    ]);
    const changedFiles = statusResult.stdout
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    return {
      repository: true,
      branch: branchResult.stdout.trim() || '(detached HEAD)',
      dirty: changedFiles.length > 0,
      changedFiles,
    };
  } catch {
    return noGitState();
  }
}

function noGitState(): GitState {
  return {
    repository: false,
    branch: null,
    dirty: false,
    changedFiles: [],
  };
}

function renderCurrentState(input: {
  generatedAt: string;
  git: GitState;
  vision: MemoryFile;
  architecture: MemoryFile;
  constraints: MemoryFile;
  decisions: MemoryFile[];
  steps: StepMemoryFile[];
}): string {
  const stepCount = new Set(input.steps.map((step) => step.step)).size;

  return `# Current State

> Generated by AgentFlow. Do not edit manually.

## Project

- Initialized: yes
- Generated at: ${input.generatedAt}

## Git

- Git repository: ${input.git.repository ? 'yes' : 'no'}
- Branch: ${input.git.branch ?? 'N/A'}
- Working tree: ${input.git.repository ? (input.git.dirty ? 'dirty' : 'clean') : 'N/A'}
- Changed files:
${renderList(input.git.changedFiles)}

## AgentFlow Memory

- Project vision: ${existsLabel(input.vision)}
- Architecture: ${existsLabel(input.architecture)}
- Constraints: ${existsLabel(input.constraints)}
- Decisions: ${input.decisions.length}
- Steps: ${stepCount}
`;
}

function renderContextPack(input: {
  generatedAt: string;
  git: GitState;
  agents: MemoryFile;
  readme: MemoryFile;
  vision: MemoryFile;
  architecture: MemoryFile;
  constraints: MemoryFile;
  decisions: MemoryFile[];
  steps: StepMemoryFile[];
  skippedFiles: string[];
}): string {
  return `# AgentFlow Context Pack

> Generated by AgentFlow. Do not edit manually.
> Generated at: ${input.generatedAt}

## 1. Project Rules

${renderFileSection(input.agents)}

## 2. Project Vision

${renderFileSection(input.vision)}

## 3. Architecture

${renderFileSection(input.architecture)}

## 4. Constraints

${renderFileSection(input.constraints)}

## 5. README Summary

${renderFileSection(input.readme)}

## 6. Decisions

${input.decisions.length === 0 ? '_Not found._' : input.decisions.map(renderFileSection).join('\n\n')}

## 7. Steps

${input.steps.length === 0 ? '_Not found._' : input.steps.map(renderFileSection).join('\n\n')}

## 8. Git State

- Git repository: ${input.git.repository ? 'yes' : 'no'}
- Branch: ${input.git.branch ?? 'N/A'}
- Working tree: ${input.git.repository ? (input.git.dirty ? 'dirty' : 'clean') : 'N/A'}
- Changed files:
${renderList(input.git.changedFiles)}

## 9. Safety Notes

The context builder uses path-level filtering only. It does not perform content-level secret scanning yet.

Filtered path rules:
${renderList([...sensitiveFilterRules])}

Skipped files:
${renderList(uniqueSorted(input.skippedFiles))}
`;
}

function renderFileSection(file: MemoryFile): string {
  if (file.content === null) {
    return `### ${file.relativePath}

_Not found._`;
  }

  return `### ${file.relativePath}

\`\`\`md
${file.content.trim()}
\`\`\``;
}

function renderList(items: readonly string[]): string {
  if (items.length === 0) {
    return '  - none';
  }

  return items.map((item) => `  - ${item}`).join('\n');
}

function existsLabel(file: MemoryFile): 'exists' | 'missing' {
  return file.content === null ? 'missing' : 'exists';
}

function uniqueSorted(items: readonly string[]): string[] {
  return [...new Set(items)].sort();
}

function compareByRelativePath(left: MemoryFile, right: MemoryFile): number {
  return left.relativePath.localeCompare(right.relativePath);
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error;
}
