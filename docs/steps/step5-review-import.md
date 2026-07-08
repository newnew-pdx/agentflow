# Step5：ReviewResult 导入与审查流

## 目标

Step5 的目标是让 AgentFlow 能导入 Reviewer 产出的结构化 `ReviewResult`，并把审查结论纳入本地 Step 状态和证据链。它补齐 `Verify -> Review -> Fix/Replan` 之间的文件接口，但仍保持人工边界清晰。

## 为什么先做 ReviewResult 导入

当前阶段先做 ReviewResult 导入，而不是直接接入 AgentChat 或网页 AI，是为了先稳定协议、状态和证据目录。这样 Reviewer 可以来自人工、网页 AI、其他代码代理或后续自动化组件，但 AgentFlow 只接收结构化结果，不负责自动调用模型。

## ReviewResult 在流程中的位置

完整目标流程是：

```text
Plan -> Approve -> Execute -> Verify -> Review -> Fix/Replan -> Commit -> Update Memory -> Next Step
```

Step5 处理的是 `Review` 回传阶段：Reviewer 根据任务包、执行结果、测试证据和 Git 证据产出 `ReviewResult`，AgentFlow 导入后更新 Step 状态。

## import-review 用法

```bash
npm run dev -- import-review examples/review-result.s001-r001.changes-required.example.json
```

命令会执行：

- 检查当前目录是否已初始化 `.agent/`。
- 读取并解析 JSON，语法错误会输出 `JSON parse failed`。
- 使用 Step1 的 `ReviewResult` schema 校验协议，失败时输出字段路径和原因。
- 根据 `stepId/runId` 查找 `.agent/steps/S001/runs/R001/`。
- 保存 `review.json`，生成 `review-summary.md`。
- 更新 `.agent/steps/S001/state.json` 的 `review` 字段和 Step 状态。

## show-review 用法

```bash
npm run dev -- show-review S001
```

命令会读取 Step 当前 run，例如 `R001`。如果存在 `review-summary.md`，优先展示它；否则读取 `review.json` 并输出 stepId、runId、verdict、summary、findings 和 suggestedNextAction。若没有审查结果，会提示：

```text
No review found for S001 / R001.
```

## review.json 的作用

`review.json` 是结构化证据，保存 Reviewer 原始结论。后续生成 Fix Packet、Replan Packet、checkpoint 或提交说明时，应优先读取它，而不是解析人类摘要。

## review-summary.md 的作用

`review-summary.md` 是面向人工阅读的摘要，包含 Step、Run、verdict、summary、findings 和下一步建议。它由 AgentFlow 自动生成，不建议手动编辑。

## verdict 与 Step 状态映射

```text
approved         -> REVIEW_APPROVED
changes_required -> CHANGES_REQUIRED
replan_required  -> REPLAN_REQUIRED
rejected         -> REVIEW_REJECTED
```

即使 verdict 是 `approved`，本阶段也只进入 `REVIEW_APPROVED`，不会自动进入 `COMPLETED`。

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
npm run dev -- show-review S001
npm run dev -- status
npm run dev -- validate examples/review-result.example.json
```

## 当前未实现

- 尚未自动调用网页 AI。
- 尚未自动生成 Fix Packet。
- 尚未自动 Replan。
- 尚未自动 Commit。
- 尚未接入 Codex CLI。

## 下一步建议

下一步可以实现 Fix Packet / Replan Packet 生成，或者先实现人工 checkpoint 辅助命令，让开发者在合并前更容易整理证据和提交边界。

## worktree 隔离

继续保持开发隔离：

```text
agentflow        ：稳定主目录，main 分支，与远程保持一致
agentflow-codex  ：Codex 执行目录，使用 feature branch 开发
```

Codex 只在 `agentflow-codex` worktree 中开发；稳定主目录不交给 Codex 打开。验证通过后再由开发者合并到 `main`，不要让 Codex 直接 push `main`。
