# Step9：Manual Executor Prompt 与真实 Java 项目闭环准备

Step9 的目标是在 AgentFlow 中补齐“把 TaskPacket 转成标准执行提示词”的能力。它新增 `make-execute-prompt <stepId>`，生成当前 run 的 `execution-request.md`，供用户复制给 Cursor、Codex 或 Claude Code 等本地执行器。

## 为什么需要 make-execute-prompt

`export-task` 只确认并暴露当前 run 的 `task.json`。真实执行时，执行器还需要知道自己的角色、边界、必须阅读的上下文、验收命令、禁止事项，以及完成后如何输出 ExecutionResult。`make-execute-prompt` 把这些重复提示词标准化，避免每个 Step 都手写。

## execution-request.md 的作用

生成文件位于：

```text
.agent/steps/<stepId>/runs/<runId>/execution-request.md
```

它面向执行器，包含 Step ID、Run ID、目标、必读上下文、完整 TaskPacket、scope、outOfScope、constraints、acceptanceCommands、执行规则和 ExecutionResult JSON 输出格式。缺失的 context pack 会标记为 `_Not found_`，不会让命令崩溃。

## 与 export-task 的区别

`export-task` 只处理 AgentFlow 状态流转：确认当前 TaskPacket 已经导出，并把 Step 状态推进到 `EXPORTED` 或 `FIX_EXPORTED`。

`make-execute-prompt` 不推进状态、不执行代码、不调用 Codex CLI，只生成给执行器使用的人类可读 Markdown。两者可以连续使用：先 `export-task`，再 `make-execute-prompt`。

## 配合 Cursor / Codex / Claude Code

用户把 `execution-request.md` 复制给任意本地代码执行器。执行器只在目标项目 worktree 中工作，按 prompt 读取上下文、修改代码、运行验收命令，最后输出 ExecutionResult JSON。AgentFlow 不自动调用这些工具。

## 配合 import-result / verify / git-check

执行器完成后，用户保存 ExecutionResult JSON，并回到 AgentFlow 运行：

```bash
agentflow import-result <execution-result.json>
agentflow verify S001
agentflow git-check S001
agentflow make-review-prompt S001
```

这样本地状态中既有 AI 自述，也有 AgentFlow 重新采集的验证与 Git 证据。

## 为什么当前不自动调用 Codex CLI

本 Step 只固定协议和交接文本，不引入自动执行器。这样可以保持 worktree 隔离、审批边界和可恢复状态，避免 AgentFlow 在尚未完成执行器适配前直接修改业务项目或推送 main。

## Fix Run 支持

当当前 run 是 `R002/R003`，且存在 `fix-from-review.md` 时，`execution-request.md` 会增加 `Fix Context`，提示执行器重点阅读当前修复说明、上一轮 `review-summary.md` 和 `review.json`。修复规则明确为只处理 review findings，不扩大原始 Step 范围，并重新运行验收命令。

## 验收命令

```bash
npm run build
npm run dev -- --help
npm run dev -- init
npm run dev -- build-context
npm run dev -- import-web-plan examples/web-plan.example.md
npm run dev -- validate .agent/steps/S001/runs/R001/task.json
npm run dev -- approve S001
npm run dev -- export-task S001
npm run dev -- make-execute-prompt S001
npm run dev -- status
```

回归命令：

```bash
npm run dev -- verify S001
npm run dev -- git-check S001
npm run dev -- make-review-prompt S001
npm run dev -- checkpoint S001
npm run dev -- validate examples/task-packet.example.json
npm run dev -- validate examples/execution-result.example.json
npm run dev -- validate examples/review-result.example.json
npm run dev -- validate examples/execution-result.manual-codex.example.json
```

下一步建议是在真实 Java 微服务项目中跑一轮完整闭环，观察提示词复用、状态恢复、文件证据和人工审批边界是否足够顺手。
