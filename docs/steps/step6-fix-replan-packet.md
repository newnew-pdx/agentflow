# Step6：Fix / Replan Packet 生成

Step6 的目标是在 ReviewResult 导入之后，把审查结论转成下一步可执行的本地文件：当 verdict 是 `changes_required` 或 `rejected` 时生成 Fix Packet；当 verdict 是 `replan_required` 时生成重新规划请求。当前阶段仍不接入 Codex CLI、Claude Code、AgentChat，不自动调用网页 AI，不自动生成业务代码，不自动 commit，也不自动 push。

## 为什么生成 Fix Packet

`changes_required` 表示原始 Step 的大目标仍然成立，只是当前 Run 的实现需要修补。如果此时重跑整个 Step，Executor 容易重新解释原始需求，扩大修改范围，甚至覆盖已经正确完成的部分。Fix Packet 会把 ReviewResult findings 转成更窄的修复任务，让下一轮只围绕审查问题工作。

## 为什么 Fix 是同一 Step 下的新 Run

修复仍属于同一个 Step 的质量闭环，不应该创建新的 Step。AgentFlow 使用同一 Step 下的递增 Run 表示迭代历史，例如 `S001/R001` 是原始执行，`S001/R002` 是根据审查生成的修复执行。这样可以保留原任务、执行结果、验证证据、审查意见和修复任务之间的清晰链路。

## create-fix

```bash
npm run dev -- create-fix S001
```

命令会读取 `.agent/steps/S001/state.json` 中的 `currentRunId`，校验对应的 `review.json`。当 verdict 是 `changes_required` 或 `rejected` 时，它会创建下一个 Run，例如 `.agent/steps/S001/runs/R002/`，并生成：

```text
.agent/steps/S001/runs/R002/task.json
.agent/steps/S001/runs/R002/fix-from-review.md
```

随后 `state.json` 会更新为 `FIX_DRAFT`，`currentRunId` 指向新 Run，并记录 `previousRunId`、`fixSourceRunId`、`fixCreatedAt` 和 `fixFindingsCount`。

## create-replan

```bash
npm run dev -- create-replan S001
```

命令会读取当前 Run 的 `review.json`。只有 verdict 是 `replan_required` 时才会生成：

```text
.agent/steps/S001/replan-request.md
```

它不会创建新的 TaskPacket，也不会修改原始 plan。`state.json` 会更新为 `REPLAN_DRAFT`，并记录 `replanRequestedAt` 和 `replanSourceRunId`。

## R002 task.json

`R002/task.json` 是新的 TaskPacket，继续符合 Step1 的 TaskPacket schema。它会把每条 finding 转成修复 scope，沿用源 Run 的 `acceptanceCommands`；如果源 TaskPacket 不存在或无法读取，则回退到 `npm run build`。它的边界会强调只修复审查问题、不扩大原始 Step 范围、不提交密钥、修复后重新验证。

## fix-from-review.md

`fix-from-review.md` 是面向人和 Executor 的修复说明。它记录源 Step、源 Run、新 Run、verdict、修复目标、所有 findings、约束和下一步命令。缺失的 `file` 或 `requiredFix` 会显示为 `N/A`，不会因为字段缺失而中断生成。

## replan-request.md

`replan-request.md` 是给后续 Planner 的重新规划请求。它记录源信息、ReviewResult summary、findings、推荐重新规划方向，以及建议读取的上下文文件。后续可以由人工或 AgentChat 读取该文件后再生成更小的 Step。

## 状态变化

- `CHANGES_REQUIRED` -> `FIX_DRAFT`
- `FIX_DRAFT` -> `FIX_APPROVED`
- `FIX_APPROVED` -> `FIX_EXPORTED`
- `REPLAN_REQUIRED` -> `REPLAN_DRAFT`

`approve S001` 和 `export-task S001` 始终使用 `state.json` 中的 `currentRunId`。因此 create-fix 后，approve/export 操作会作用于 `R002/task.json`。

## 验收命令

```bash
npm run build
npm run dev -- --help
npm run dev -- init
npm run dev -- build-context
npm run dev -- plan "为 Java 微服务项目增加 JWT 认证"
npm run dev -- approve S001
npm run dev -- export-task S001
npm run dev -- verify S001
npm run dev -- git-check S001
npm run dev -- import-review examples/review-result.s001-r001.changes-required.example.json
npm run dev -- create-fix S001
npm run dev -- validate .agent/steps/S001/runs/R002/task.json
npm run dev -- approve S001
npm run dev -- export-task S001
npm run dev -- status
```

重新规划流程可使用：

```bash
npm run dev -- plan "测试重新规划流程"
npm run dev -- approve S002
npm run dev -- export-task S002
npm run dev -- verify S002
npm run dev -- git-check S002
npm run dev -- import-review examples/review-result.s002-r001.replan-required.example.json
npm run dev -- create-replan S002
npm run dev -- status
```

回归验证：

```bash
npm run dev -- validate examples/task-packet.example.json
npm run dev -- validate examples/execution-result.example.json
npm run dev -- validate examples/review-result.example.json
npm run dev -- build-context
```

## 当前没有实现

- 尚未自动调用 Codex 修复。
- 尚未自动调用 AgentChat 重新规划。
- 尚未自动 commit。
- 尚未自动多轮循环。
- 尚未限制最大修复轮数。

## 下一步建议

- 实现人工 checkpoint 辅助命令。
- 或实现 Manual Executor 闭环说明。

## 工作树隔离

继续保持隔离策略：

```text
agentflow        ：稳定主目录，main 分支，与远程保持一致
agentflow-codex  ：Codex 执行目录，使用 feature branch 开发
```

Codex 只在 `agentflow-codex` worktree 中开发。稳定主目录 `agentflow` 不交给 Codex 打开；验证通过后再人工合并到 `main`，不要让 Codex 直接 push `main`。
