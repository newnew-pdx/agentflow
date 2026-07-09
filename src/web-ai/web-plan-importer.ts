import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { ZodError } from 'zod';
import { parseWebPlan } from './web-plan-parser.js';
import { normalizeTaskPacketCandidate } from './protocol-normalizer.js';
import { nextRunId, nextStepId } from '../workflow/step-id.js';
import type { StepState } from '../workflow/step-state.js';
import {
  getRunDirectory,
  getStepDirectory,
  getTaskPacketPath,
  listRunIds,
  listStepIds,
  writeJson,
  writeStepState,
  writeText,
} from '../workflow/step-store.js';

export type ImportWebPlanResult = {
  stepId: string;
  runId: string;
  taskPath: string;
  parseSource: 'json-block' | 'markdown';
};

export async function importWebPlan(file: string): Promise<ImportWebPlanResult> {
  const sourcePath = path.resolve(file);
  const source = await readFile(sourcePath, 'utf8');
  const parsed = parseWebPlan(source);
  const stepId = nextStepId(await listStepIds());
  const runId = nextRunId(await listRunIds(stepId));
  const now = new Date().toISOString();
  const taskPacket = normalizeTaskPacketCandidate({
    candidate: parsed.candidate,
    stepId,
    runId,
    createdAt: now,
  });
  const stepDir = getStepDirectory(stepId);
  const runDir = getRunDirectory(stepId, runId);

  await writeText(path.join(stepDir, 'spec.md'), renderSpec(stepId, taskPacket.goal, taskPacket.background));
  await writeText(path.join(stepDir, 'plan.md'), renderPlan(stepId, taskPacket.scope, taskPacket.outOfScope, parsed.source));
  await writeText(path.join(stepDir, 'acceptance.md'), renderAcceptance(stepId, taskPacket.acceptanceCommands, taskPacket.constraints));

  const state: StepState = {
    stepId,
    status: 'DRAFT',
    goal: taskPacket.goal,
    currentRunId: runId,
    createdAt: now,
    updatedAt: now,
  };

  await writeStepState(stepId, state);
  await writeJson(getTaskPacketPath(stepId, runId), taskPacket);
  await writeText(path.join(runDir, 'web-plan-source.md'), source);

  return {
    stepId,
    runId,
    taskPath: getTaskPacketPath(stepId, runId),
    parseSource: parsed.source,
  };
}

export function formatZodIssues(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const issuePath = issue.path.length === 0 ? '<root>' : issue.path.map(String).join('.');
    return `- ${issuePath}: ${issue.message}`;
  });
}

function renderSpec(stepId: string, goal: string, background?: string): string {
  return `# ${stepId} 任务说明

## 目标

${goal}

## 背景

${background || '由 Web Plan 导入生成。'}

## 来源

本 Step 由 \`agentflow import-web-plan\` 从 Web AI 规划文本导入。Web AI 只负责语义规划，AgentFlow 负责补齐系统字段、校验协议并写入状态。
`;
}

function renderPlan(stepId: string, scope: string[], outOfScope: string[], source: string): string {
  return `# ${stepId} 实施计划

## 导入方式

${source === 'json-block' ? '从 Markdown JSON 代码块提取 TaskPacket JSON Candidate。' : '从结构化 Markdown 标题进行基础解析。'}

## Scope

${renderList(scope)}

## Out of Scope

${renderList(outOfScope)}
`;
}

function renderAcceptance(stepId: string, commands: string[], constraints: string[]): string {
  return `# ${stepId} 验收标准

## 验收命令

\`\`\`bash
${commands.join('\n')}
\`\`\`

## 约束

${renderList(constraints)}
`;
}

function renderList(items: string[]): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : '- 暂无';
}
