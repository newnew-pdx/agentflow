import { readFile } from 'node:fs/promises';
import { PROTOCOL_VERSION, taskPacketSchema, type TaskPacket } from '../protocols/index.js';
import type { ReviewResult } from '../protocols/review-result.js';
import { pathExists } from '../utils/fs.js';
import { getTaskPacketPath } from '../workflow/step-store.js';

function findingToScope(finding: ReviewResult['findings'][number], index: number): string {
  const file = finding.file?.trim() ? `（${finding.file.trim()}）` : '';
  const requiredFix = finding.requiredFix?.trim() ? `；修复要求：${finding.requiredFix.trim()}` : '';
  return `修复审查问题 ${index + 1}${file}：${finding.problem}${requiredFix}`;
}

async function readSourceAcceptanceCommands(stepId: string, sourceRunId: string): Promise<string[]> {
  const sourceTaskPath = getTaskPacketPath(stepId, sourceRunId);
  if (!(await pathExists(sourceTaskPath))) return ['npm run build'];

  try {
    const source = JSON.parse(await readFile(sourceTaskPath, 'utf8')) as Partial<TaskPacket>;
    return Array.isArray(source.acceptanceCommands) && source.acceptanceCommands.length > 0
      ? source.acceptanceCommands.filter((command): command is string => typeof command === 'string' && command.trim().length > 0)
      : ['npm run build'];
  } catch {
    return ['npm run build'];
  }
}

export async function createFixTaskPacket(input: {
  review: ReviewResult;
  newRunId: string;
  createdAt: string;
}): Promise<TaskPacket> {
  const { review, newRunId, createdAt } = input;
  const findingScopes = review.findings.map(findingToScope);
  const scope = findingScopes.length > 0
    ? findingScopes
    : ['修复 ReviewResult 中列出的 findings'];

  return taskPacketSchema.parse({
    protocolVersion: PROTOCOL_VERSION,
    stepId: review.stepId,
    runId: newRunId,
    goal: `修复 ${review.stepId} 审查中发现的问题`,
    background: `This fix task is generated from ReviewResult of ${review.stepId}/${review.runId}.`,
    scope: [
      ...scope,
      '保持原始需求目标不变',
      '修复后重新运行验收命令',
    ],
    outOfScope: [
      '不要引入与 review findings 无关的大范围重构',
      '不要扩大原始 Step 的功能范围',
    ],
    contextFiles: [
      `.agent/steps/${review.stepId}/runs/${review.runId}/task.json`,
      `.agent/steps/${review.stepId}/runs/${review.runId}/review.json`,
      `.agent/steps/${review.stepId}/runs/${review.runId}/review-summary.md`,
      `.agent/steps/${review.stepId}/runs/${review.runId}/tests.json`,
      `.agent/steps/${review.stepId}/runs/${review.runId}/git.json`,
      '.agent/generated/context-pack.md',
    ],
    constraints: [
      '只修复审查意见指出的问题',
      '仅修复审查问题，不扩大范围',
      '不要提交密钥',
      '不要大范围重构无关代码',
      '修复完成后需要重新验证',
    ],
    acceptanceCommands: await readSourceAcceptanceCommands(review.stepId, review.runId),
    requiresApproval: true,
    createdAt,
  });
}
