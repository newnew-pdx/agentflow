import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathExists } from '../utils/fs.js';
import {
  getExecutionPromptPath,
  getExecutionResultPath,
  getRunDirectory,
  readStepState,
} from '../workflow/step-store.js';
import type { StepReviewSummary, StepState } from '../workflow/step-state.js';

export type NextActionRecommendation = {
  stepId: string;
  status: StepState['status'];
  runId: string;
  commands: string[];
  reason: string[];
  note?: string[];
};

export async function getNextAction(stepId: string): Promise<NextActionRecommendation | undefined> {
  const state = await readStepState(stepId);
  if (!state) return undefined;

  const runId = state.currentRunId;
  const runDir = getRunDirectory(stepId, runId);
  const artifact = (fileName: string) => path.join(runDir, fileName);

  if (state.status === 'CHECKPOINT_READY' || state.checkpoint?.status === 'ready') {
    return {
      stepId,
      status: state.status,
      runId,
      commands: [
        'git add .',
        'git status --short',
        `git commit -m "$(cat .agent/steps/${stepId}/runs/${runId}/commit-message.txt)"`,
      ],
      note: ['PowerShell 下不一定支持上述 shell substitution；也可以复制 commit-message.txt 的内容作为提交信息。'],
      reason: ['Checkpoint 已经 ready，可以由人工执行 Git 提交。AgentFlow 不会自动 commit 或 push。'],
    };
  }

  if (state.status === 'DRAFT') {
    return recommend(state, [`npm run dev -- approve ${stepId}`], ['当前 Step 仍是 DRAFT，需要先人工批准。']);
  }

  if (state.status === 'APPROVED' || state.status === 'FIX_APPROVED') {
    return recommend(
      state,
      [`npm run dev -- export-task ${stepId}`, `npm run dev -- make-execute-prompt ${stepId}`],
      ['当前 Step 已批准，需要导出 TaskPacket 并生成给执行者使用的手动执行提示词。'],
    );
  }

  const executionResultExists = await pathExists(getExecutionResultPath(stepId, runId));
  const executorRunPath = artifact('executor-run.json');
  const executorRunExists = await pathExists(executorRunPath);
  const executorOutputPath = artifact('executor-output.md');
  const testsExists = await pathExists(artifact('tests.json'));
  const gitExists = await pathExists(artifact('git.json'));
  const webReviewPromptExists = await pathExists(artifact('web-review-request.md'));
  const reviewExists = await pathExists(artifact('review.json'));
  const reviewVerdict = await readReviewVerdict(artifact('review.json'));

  if (state.status === 'EXPORTED' || state.status === 'FIX_EXPORTED') {
    const executionPromptExists = await pathExists(getExecutionPromptPath(stepId, runId));
    if (!executionPromptExists) {
      return recommend(
        state,
        [`npm run dev -- make-execute-prompt ${stepId}`],
        ['当前任务已导出，但 execution-request.md 尚未生成。'],
      );
    }

    if (executorRunExists && !executionResultExists) {
      const executorRun = await readExecutorRun(executorRunPath);
      if (executorRun?.status === 'failed') {
        return recommend(
          state,
          [`npm run dev -- run-executor ${stepId} --executor manual`],
          ['executor-run.json 显示执行器失败，需要人工检查 executor-output.md 或改用 manual executor。'],
          [
            `执行器：${executorRun.executor}`,
            `失败状态：${executorRun.status}`,
            `输出文件：${toRelativePath(executorOutputPath)}`,
            ...executorRun.warnings.map((warning) => `警告：${warning}`),
          ],
        );
      }

      return recommend(
        state,
        [`npm run dev -- import-candidate ${toRelativePath(executorOutputPath)}`],
        ['executor-run.json 已存在，但 execution-result.json 尚未导入。请先导入 executor-output.md 中的候选结果。'],
        [`执行器输出：${toRelativePath(executorOutputPath)}`],
      );
    }

    return recommend(
      state,
      [`npm run dev -- run-executor ${stepId} --executor manual`, `npm run dev -- run-executor ${stepId} --executor dry-run`],
      ['execution-request.md 已存在，可以通过 Executor Gateway 记录一次 manual 或 dry-run 执行。'],
      [`执行提示词：${toRelativePath(getExecutionPromptPath(stepId, runId))}`],
    );
  }

  if (executionResultExists && !testsExists) {
    return recommend(state, [`npm run dev -- verify ${stepId}`], ['已经导入 execution-result.json，但还没有 tests.json。']);
  }

  if (testsExists && !gitExists) {
    return recommend(state, [`npm run dev -- git-check ${stepId}`], ['tests.json 已存在，但还没有 Git 证据 git.json。']);
  }

  if (testsExists && gitExists && !webReviewPromptExists) {
    return recommend(
      state,
      [`npm run dev -- make-review-prompt ${stepId}`],
      ['测试结果和 Git 证据已齐备，但还没有 web-review-request.md。'],
    );
  }

  if (
    (state.status === 'CHECKPOINT_BLOCKED' || state.checkpoint?.status === 'blocked') &&
    reviewVerdict !== 'changes_required' &&
    reviewVerdict !== 'replan_required'
  ) {
    return recommend(
      state,
      [],
      ['Checkpoint 当前 blocked，需要先补齐缺失证据或处理阻塞原因。'],
      state.checkpoint?.blockingReasons.map((reason) => `阻塞原因：${reason}`) ?? [],
    );
  }

  if (webReviewPromptExists && !reviewExists) {
    return recommend(
      state,
      [`npm run dev -- import-candidate <web-review-output.md>`],
      ['web-review-request.md 已生成，请把它交给网页 AI / AgentChat skill 审查，然后导入审查候选输出。'],
      [`审查提示词：${toRelativePath(artifact('web-review-request.md'))}`],
    );
  }

  if (reviewVerdict === 'approved') {
    return recommend(state, [`npm run dev -- checkpoint ${stepId}`], ['Review verdict 是 approved，可以进入 checkpoint。']);
  }

  if (reviewVerdict === 'changes_required') {
    return recommend(
      state,
      [
        `npm run dev -- create-fix ${stepId}`,
        `npm run dev -- approve ${stepId}`,
        `npm run dev -- export-task ${stepId}`,
        `npm run dev -- make-execute-prompt ${stepId}`,
      ],
      ['Review verdict 是 changes_required，需要先创建修复 run，再继续执行链路。'],
    );
  }

  if (reviewVerdict === 'replan_required') {
    return recommend(state, [`npm run dev -- create-replan ${stepId}`], ['Review verdict 是 replan_required，需要回到重新规划。']);
  }

  return recommend(state, [`npm run dev -- status`], ['当前状态没有命中更具体的规则，请先查看整体状态。']);
}

async function readExecutorRun(executorRunPath: string): Promise<
  | {
      executor: string;
      status: 'completed' | 'failed' | 'blocked';
      warnings: string[];
    }
  | undefined
> {
  try {
    const data = JSON.parse(await readFile(executorRunPath, 'utf8')) as {
      executor?: unknown;
      status?: unknown;
      warnings?: unknown;
    };
    if (
      typeof data.executor === 'string' &&
      (data.status === 'completed' || data.status === 'failed' || data.status === 'blocked')
    ) {
      return {
        executor: data.executor,
        status: data.status,
        warnings: Array.isArray(data.warnings) ? data.warnings.filter((item): item is string => typeof item === 'string') : [],
      };
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function recommend(
  state: StepState,
  commands: string[],
  reason: string[],
  note?: string[],
): NextActionRecommendation {
  return {
    stepId: state.stepId,
    status: state.status,
    runId: state.currentRunId,
    commands,
    reason,
    note,
  };
}

async function readReviewVerdict(reviewPath: string): Promise<StepReviewSummary['verdict'] | undefined> {
  if (!(await pathExists(reviewPath))) return undefined;

  try {
    const data = JSON.parse(await readFile(reviewPath, 'utf8')) as { verdict?: unknown };
    return data.verdict === 'approved' ||
      data.verdict === 'changes_required' ||
      data.verdict === 'replan_required' ||
      data.verdict === 'rejected'
      ? data.verdict
      : undefined;
  } catch {
    return undefined;
  }
}

function toRelativePath(targetPath: string): string {
  return path.relative(process.cwd(), targetPath).replace(/\\/g, '/');
}
