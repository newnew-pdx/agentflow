# AgentFlow 路线图

## Step4：验证器与 Git 证据（已完成）

- 新增 `verify <stepId>`，读取当前 run 的 TaskPacket，并执行 `acceptanceCommands`。
- 生成 `tests.json`，记录每条命令的 exitCode、stdout、stderr、耗时和通过状态。
- 根据验证结果把 Step 状态更新为 `VERIFIED` 或 `BLOCKED`，并在 `state.json` 中写入 `verification` 摘要。
- 新增 `git-check <stepId>`，采集分支、工作区状态、变更文件、diff stat 和安全过滤后的 patch。
- 生成 `git.json`，可生成 `git-diff.patch`，并在 `state.json` 中写入 `gitCheck` 摘要。
- 对 `.env`、密钥和证书类路径做敏感文件风险提示，不阻塞命令，但避免把敏感文件 diff 内容写入 patch。
- `status` 会展示验证结果和 Git 检查摘要。
- 本阶段仍不自动 Review、不自动 Commit、不接入 Codex CLI / AgentChat，也不引入 SQLite 状态机。

详细说明见 [Step4：验证器与 Git 证据](steps/step4-verifier-git-evidence.md)。

路线图用于说明实现顺序，不代表所列能力已经完成。

## Step0：CLI 项目骨架（已完成）

- 建立 TypeScript + Node.js 项目；
- 提供 `init`、`status` 和占位版 `plan` 命令；
- 创建本地 `.agent/` 工作区；
- 建立共享类型、错误处理、文件工具和协议目录；
- 补充构建、运行与验收文档。

详细说明见 [Step0：CLI 项目骨架](steps/step0-cli-skeleton.md)。

## Step1：核心协议（已完成）

- 定义版本化的 `TaskPacket`；
- 定义 `ExecutionResult` 和 `ReviewResult`；
- 使用 Zod 实现运行时校验；
- 提供协议自动识别与 `validate` CLI 命令；
- 为有效和无效协议补充 JSON 样例。

详细说明见 [Step1：任务与反馈协议](steps/step1-protocols.md)。

## Step2：本地记忆与 Context Pack（已完成）

- 建立 `.agent/` 本地记忆文件的读写约定；
- 汇总项目目标、架构、约束、决策和当前状态；
- 生成可供后续 Planner/Executor 使用的 context pack。

## 后续阶段：状态与执行闭环

- 接入规划器和人工审批流程；
- 引入 SQLite 状态存储和流程状态机；
- 接入 Codex、AgentChat 等执行或协作组件；
- 增加测试验证、审查、修复和重新规划；
- 编排 Git 提交并更新项目记忆和 Context Pack。

后续范围将根据前一步协议和验收结果继续拆分，避免一次引入过多复杂度。

## Step3：半自动任务流（已完成）

- 用 `.agent/steps/` 文件结构保存 Step 状态，不引入 SQLite。
- `plan` 会创建 `S001/R001`、中文说明文档、`state.json` 和符合 TaskPacket schema 的 `task.json`。
- 新增 `approve`、`export-task`、`import-result` 命令，串联人工审批、任务包导出和 ExecutionResult 导入。
- `status` 会展示 Step 列表、当前状态、目标、Run 和 ExecutionResult 摘要。
- 当前仍不接入 Codex、Claude Code、AgentChat，不自动测试、Review、Commit 或 Push。

详细说明见 [Step3：半自动任务流](steps/step3-semi-auto-workflow.md)。
