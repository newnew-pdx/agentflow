import type { StepState } from '../workflow/step-state.js';
import type { ArtifactInventoryItem } from './artifact-inventory.js';

export type HealthCheckItem = {
  label: string;
  passed: boolean;
  note: string;
};

export type WorkflowHealth = {
  items: HealthCheckItem[];
  warnings: string[];
};

export function buildWorkflowHealth(state: StepState, inventory: ArtifactInventoryItem[]): WorkflowHealth {
  const warnings: string[] = [];
  const currentRunArtifacts = new Map(
    inventory.filter((item) => item.runId === state.currentRunId).map((item) => [item.artifact, item.status]),
  );
  const has = (artifact: string): boolean => currentRunArtifacts.get(artifact as never) === 'exists';

  if (state.review?.verdict === 'changes_required' && state.status !== 'CHANGES_REQUIRED' && state.status !== 'FIX_DRAFT' && state.status !== 'CHECKPOINT_BLOCKED') {
    warnings.push('review.verdict 是 changes_required，但主状态没有停留在 CHANGES_REQUIRED/FIX_DRAFT/CHECKPOINT_BLOCKED。');
  }

  if (state.review?.verdict === 'approved' && state.status !== 'REVIEW_APPROVED' && state.status !== 'CHECKPOINT_READY') {
    warnings.push('review.verdict 是 approved，但主状态不是 REVIEW_APPROVED/CHECKPOINT_READY。');
  }

  if (state.verification?.status === 'failed' && state.status !== 'BLOCKED' && state.status !== 'CHECKPOINT_BLOCKED') {
    warnings.push('tests failed，但主状态不是 BLOCKED/CHECKPOINT_BLOCKED。');
  }

  const reviewAffectsState = state.review
    ? verdictMatchesStatus(state.review.verdict, state.status)
    : false;

  return {
    warnings,
    items: [
      {
        label: 'Step 状态是否能正确流转',
        passed: warnings.length === 0,
        note: warnings.length === 0 ? 'state.json 中的状态摘要与轻量规则一致。' : warnings.join(' '),
      },
      {
        label: 'TaskPacket 是否驱动执行提示词',
        passed: has('task.json') && has('execution-request.md'),
        note: has('task.json') ? 'task.json 存在；execution-request.md 用于手工执行。' : '当前 run 缺少 task.json。',
      },
      {
        label: 'Verification 是否提供客观测试证据',
        passed: has('tests.json') && state.verification?.status !== undefined,
        note: state.verification ? `state.json 记录 verification=${state.verification.status}。` : 'state.json 未记录 verification 摘要。',
      },
      {
        label: 'Git evidence 是否记录真实变更',
        passed: has('git.json') && state.gitCheck !== undefined,
        note: state.gitCheck ? `记录 changedFiles=${state.gitCheck.changedFilesCount}。` : 'state.json 未记录 gitCheck 摘要。',
      },
      {
        label: 'Web Review 是否基于证据生成',
        passed: has('web-review-request.md') && has('tests.json') && has('git.json'),
        note: has('web-review-request.md') ? 'web-review-request.md 已生成。' : '当前 run 缺少 web-review-request.md。',
      },
      {
        label: 'ReviewResult 是否正确影响状态',
        passed: reviewAffectsState,
        note: state.review ? `review.verdict=${state.review.verdict}, status=${state.status}。` : 'state.json 未记录 review 摘要。',
      },
      {
        label: 'changes_required 是否能进入 create-fix',
        passed: state.review?.verdict === 'changes_required' ? Boolean(state.fixSourceRunId || has('fix-from-review.md')) : true,
        note: state.fixSourceRunId ? `已从 ${state.fixSourceRunId} 创建修复 run。` : '若 verdict 为 changes_required，应能通过 create-fix 生成下一轮任务。',
      },
      {
        label: 'checkpoint 是否能阻止不完整流程',
        passed: state.checkpoint?.status === 'blocked' || state.checkpoint?.status === 'ready' || state.checkpoint?.status === 'warning',
        note: state.checkpoint ? `checkpoint=${state.checkpoint.status}。` : 'state.json 未记录 checkpoint 摘要。',
      },
    ],
  };
}

function verdictMatchesStatus(verdict: NonNullable<StepState['review']>['verdict'], status: StepState['status']): boolean {
  if (verdict === 'approved') return status === 'REVIEW_APPROVED' || status === 'CHECKPOINT_READY';
  if (verdict === 'changes_required') return status === 'CHANGES_REQUIRED' || status === 'FIX_DRAFT' || status === 'CHECKPOINT_BLOCKED';
  if (verdict === 'replan_required') return status === 'REPLAN_REQUIRED' || status === 'REPLAN_DRAFT';
  if (verdict === 'rejected') return status === 'REVIEW_REJECTED' || status === 'FIX_DRAFT' || status === 'CHECKPOINT_BLOCKED';
  return false;
}
