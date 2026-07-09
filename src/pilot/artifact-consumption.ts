import type { ArtifactInventoryItem, RunArtifactName } from './artifact-inventory.js';

export type ArtifactConsumptionRule = {
  artifact: string;
  consumedBy: string[];
  note: string;
};

export type ArtifactConsumptionResult = {
  rules: ArtifactConsumptionRule[];
  redundancyCandidates: string[];
};

const consumptionRules: ArtifactConsumptionRule[] = [
  {
    artifact: 'context-pack.md',
    consumedBy: ['make-plan-prompt', 'make-execute-prompt', 'make-review-prompt'],
    note: '为 Planner / Executor / Reviewer 提供当前项目背景。',
  },
  {
    artifact: 'task.json',
    consumedBy: ['validate', 'export-task', 'make-execute-prompt', 'verify', 'make-review-prompt'],
    note: '贯穿任务导出、执行提示、验证和审查。',
  },
  {
    artifact: 'web-plan-source.md',
    consumedBy: ['human audit'],
    note: '主要用于追溯 Web Plan 来源，当前不驱动后续命令。',
  },
  {
    artifact: 'execution-request.md',
    consumedBy: ['manual executor'],
    note: '由人工复制给 Codex/Cursor 等执行器。',
  },
  {
    artifact: 'execution-result.json',
    consumedBy: ['import-result', 'make-review-prompt', 'status'],
    note: '记录执行器输出，并进入审查证据包。',
  },
  {
    artifact: 'tests.json',
    consumedBy: ['make-review-prompt', 'checkpoint'],
    note: '作为审查和 checkpoint 的测试证据。',
  },
  {
    artifact: 'git.json',
    consumedBy: ['make-review-prompt', 'checkpoint'],
    note: '作为审查和 checkpoint 的 Git 证据。',
  },
  {
    artifact: 'git-diff.patch',
    consumedBy: ['make-review-prompt'],
    note: '让 Reviewer 检查具体代码差异。',
  },
  {
    artifact: 'web-review-request.md',
    consumedBy: ['manual reviewer'],
    note: '由人工复制给网页 AI / AgentChat skill。',
  },
  {
    artifact: 'review.json',
    consumedBy: ['show-review', 'create-fix', 'create-replan', 'checkpoint', 'status'],
    note: '审查结论会影响状态流转和下一步任务生成。',
  },
  {
    artifact: 'review-summary.md',
    consumedBy: ['show-review', 'create-fix', 'make-execute-prompt', 'checkpoint'],
    note: '面向人工和修复提示词的审查摘要。',
  },
  {
    artifact: 'fix-from-review.md',
    consumedBy: ['R002 make-execute-prompt'],
    note: '修复 run 的执行提示词会读取它作为 Fix Context。',
  },
  {
    artifact: 'checkpoint-summary.md',
    consumedBy: ['human audit', 'make-review-prompt'],
    note: '主要面向人工提交前检查，也可作为审查证据。',
  },
  {
    artifact: 'commit-message.txt',
    consumedBy: ['manual commit'],
    note: '提交仍由人工执行。',
  },
];

const artifactsWithKnownConsumers = new Set(consumptionRules.map((rule) => rule.artifact));

export function buildArtifactConsumption(inventory: ArtifactInventoryItem[]): ArtifactConsumptionResult {
  const existingArtifacts = new Set(inventory.filter((item) => item.status === 'exists').map((item) => item.artifact));
  const redundancyCandidates = [...existingArtifacts]
    .filter((artifact): artifact is RunArtifactName => !artifactsWithKnownConsumers.has(artifact))
    .map((artifact) => `${artifact}: possible redundancy，当前没有固定消费规则。`);

  if (existingArtifacts.has('web-plan-source.md')) {
    redundancyCandidates.push('web-plan-source.md: possible redundancy，当前主要用于人工追溯，尚未被后续命令直接消费。');
  }

  if (existingArtifacts.has('commit-message.txt')) {
    redundancyCandidates.push('commit-message.txt: possible redundancy，当前只服务人工提交，可保留但不属于核心状态流。');
  }

  return {
    rules: consumptionRules,
    redundancyCandidates,
  };
}
