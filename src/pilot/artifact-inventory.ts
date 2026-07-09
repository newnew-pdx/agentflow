import path from 'node:path';
import { pathExists } from '../utils/fs.js';

export const runArtifactNames = [
  'task.json',
  'web-plan-source.md',
  'execution-request.md',
  'execution-result.json',
  'tests.json',
  'git.json',
  'git-diff.patch',
  'web-review-request.md',
  'review.json',
  'review-summary.md',
  'fix-from-review.md',
  'checkpoint-summary.md',
  'commit-message.txt',
] as const;

export type RunArtifactName = (typeof runArtifactNames)[number];

export type ArtifactInventoryItem = {
  runId: string;
  artifact: RunArtifactName;
  status: 'exists' | 'missing';
  purpose: string;
};

const artifactPurposes: Record<RunArtifactName, string> = {
  'task.json': 'Executor 的结构化任务输入，也是验证和后续提示词的核心入口。',
  'web-plan-source.md': '保留 Web AI 规划来源，便于追溯 TaskPacket 的生成依据。',
  'execution-request.md': '给 Codex/Cursor 等手工执行器的执行提示词。',
  'execution-result.json': 'Executor 返回的结构化执行结果。',
  'tests.json': 'AgentFlow 本地验收命令产生的客观测试证据。',
  'git.json': 'Git 状态、变更文件和安全提示证据。',
  'git-diff.patch': 'Git diff 证据，供人工或 Web Review 检查具体改动。',
  'web-review-request.md': '给网页 AI / AgentChat skill 的审查请求。',
  'review.json': 'Reviewer 的结构化审查结果。',
  'review-summary.md': '面向人工阅读的审查摘要。',
  'fix-from-review.md': '从 ReviewResult 生成的修复任务说明。',
  'checkpoint-summary.md': '提交前 checkpoint 的人工可读摘要。',
  'commit-message.txt': '提交前生成的 commit message 建议。',
};

export async function buildArtifactInventory(stepDir: string, runIds: string[]): Promise<ArtifactInventoryItem[]> {
  const items: ArtifactInventoryItem[] = [];

  for (const runId of runIds) {
    const runDir = path.join(stepDir, 'runs', runId);
    for (const artifact of runArtifactNames) {
      items.push({
        runId,
        artifact,
        status: (await pathExists(path.join(runDir, artifact))) ? 'exists' : 'missing',
        purpose: artifactPurposes[artifact],
      });
    }
  }

  return items;
}

export function getArtifactPurpose(artifact: RunArtifactName): string {
  return artifactPurposes[artifact];
}
