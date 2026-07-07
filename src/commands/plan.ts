import path from 'node:path';
import { nextRunId, nextStepId } from '../workflow/step-id.js';
import {
  assertInitialized,
  getStepDirectory,
  getTaskPacketPath,
  listRunIds,
  listStepIds,
  writeJson,
  writeStepState,
  writeText,
} from '../workflow/step-store.js';
import type { StepState } from '../workflow/step-state.js';
import { createInitialTaskPacket } from '../workflow/task-packet-factory.js';

export async function planCommand(goal: string): Promise<void> {
  if (!(await assertInitialized())) {
    console.error('AgentFlow is not initialized. Run `agentflow init` first.');
    process.exitCode = 1;
    return;
  }

  const stepId = nextStepId(await listStepIds());
  const runId = nextRunId(await listRunIds(stepId));
  const now = new Date().toISOString();
  const stepDir = getStepDirectory(stepId);
  const taskPacket = createInitialTaskPacket({ stepId, runId, goal, createdAt: now });

  await writeText(
    path.join(stepDir, 'spec.md'),
    `# ${stepId} 任务说明\n\n## 原始目标\n\n${goal}\n\n## 背景\n\n此文件由 \`agentflow plan\` 自动生成，后续可由开发者补充范围、背景和约束。\n`,
  );
  await writeText(
    path.join(stepDir, 'plan.md'),
    `# ${stepId} 实施计划\n\n此计划是 AgentFlow 自动生成的初稿，用于占位和人工确认。\n\n1. 阅读任务说明与上下文。\n2. 按 TaskPacket 范围执行修改。\n3. 运行验收命令并记录结果。\n4. 将 ExecutionResult 导回 AgentFlow。\n`,
  );
  await writeText(
    path.join(stepDir, 'acceptance.md'),
    `# ${stepId} 验收标准\n\n## 验收命令\n\n\`\`\`bash\nnpm run build\n\`\`\`\n\n## 验收标准\n\n- 任务范围与目标一致。\n- 不提交密钥或敏感信息。\n- 保持现有功能可运行。\n- 执行结果通过 ExecutionResult 回传。\n`,
  );

  const state: StepState = {
    stepId,
    status: 'DRAFT',
    goal,
    currentRunId: runId,
    createdAt: now,
    updatedAt: now,
  };

  await writeStepState(stepId, state);
  await writeJson(getTaskPacketPath(stepId, runId), taskPacket);

  console.log(`Step ${stepId} planned.`);
  console.log(`Run: ${runId}`);
  console.log(`TaskPacket: ${path.relative(process.cwd(), getTaskPacketPath(stepId, runId))}`);
  console.log('Next action: approve ' + stepId);
}
