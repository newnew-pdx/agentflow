# AgentFlow 路线图

## Step14：Codex Executor Safe Pilot（已完成）

- 新增 `check-executor codex`，只检查 `.agent/config.yaml` 中的 Codex executor 配置和命令可发现性，不执行任务。
- `run-executor <stepId> --executor codex` 必须显式追加 `--confirm` 才会启动外部 Codex CLI；未确认时直接拒绝，并且不写 executor run 产物。
- CodexCliExecutor 使用 `execution-request.md` 作为 stdin，支持 `timeoutMs`、stdout/stderr 捕获、exitCode、spawn error、超时 kill 和输出截断。
- `executor-run.json` 增加 `confirmed`、`timedOut`、`truncated`、`command`、`args`、`timeoutMs`、`errorMessage` 等字段。
- `executor-output.md` 统一记录 Executor、Stdout、Stderr 和 Notes，并明确说明输出未被信任，只有包含有效 ExecutionResult JSON 时才应 import-candidate。
- `next-action` 针对 codex completed 建议人工 `import-candidate`，针对 failed 建议查看输出并 fallback 到 manual executor。
- `status` 针对 codex 显示 `Executor: codex, completed, exitCode: 0` 或 timeout 摘要。
- Windows 下推荐使用 `cmd.exe /d /s /c "...codex.cmd exec ... -"` 与 `promptMode=file-reference`，避免 `powershell.exe -File codex.ps1` 的中文 UTF-8 乱码，也避免 Node 直接 spawn `.cmd` 时出现 `spawn EINVAL`。
- `make-execute-prompt` 生成的 `execution-request.md` 增加 Windows UTF-8 文件读取规则，要求读取中文文本时使用 `Get-Content -Raw -Encoding UTF8 <path>`。
- 本 Step 仍不自动 import-candidate、不自动 verify/git-check/review、不自动 commit/push，也不完整适配所有 Codex CLI 参数。

详细说明见 [Step14：Codex Executor Safe Pilot](steps/step14-codex-executor-safe-pilot.md)。

## Step13：Executor Gateway 最小接入（已完成）

- 新增 `run-executor <stepId> --executor <dry-run|manual|codex>`，从当前 Step 的 `currentRunId` 定位 `task.json` 与 `execution-request.md`。
- 新增 Executor 接口、DryRunExecutor、ManualExecutor、CodexCliExecutor 和 executor run 写入逻辑。
- DryRunExecutor 不调用外部命令，只生成 `executor-run.json` 与 `executor-output.md`，用于验证网关链路。
- ManualExecutor 读取 `execution-request.md`，生成人工复制给 Cursor / Codex / Claude Code 的执行说明，并统一记录 executor run。
- CodexCliExecutor 支持从 `.agent/config.yaml` 读取 `executors.codex.command`、`args`、`timeoutMs`，用 `execution-request.md` 作为 stdin 调用本地命令；命令不可用时写入失败记录和配置提示。
- `state.json` 新增 `executorRun` 摘要，但 executor completed 不会把 Step 主状态改为 `COMPLETED`。
- `status` 展示当前 run 的 Executor 摘要；`next-action` 在已导出且已有 executor run 但没有 `execution-result.json` 时建议 `import-candidate executor-output.md`。
- 本 Step 不自动调用 AgentChat、不自动调用网页 AI、不自动 review、不自动 commit、不自动 push，也不实现完整自动闭环。

详细说明见 [Step13：Executor Gateway 最小接入](steps/step13-executor-gateway.md)。

## Step12：Candidate Import 与 Next Action Assistant（已完成）

- 新增 `import-candidate <file>`，支持从纯 JSON、Markdown ```json 代码块和普通代码块中提取候选 JSON。
- 自动识别 ExecutionResult / ReviewResult / TaskPacket candidate；ExecutionResult 与 ReviewResult 会使用现有 Zod schema 校验，并复用现有导入保存逻辑。
- ExecutionResult candidate 会写入 `.agent/steps/<stepId>/runs/<runId>/execution-result.json` 并更新 state 执行摘要。
- ReviewResult candidate 会写入 `.agent/steps/<stepId>/runs/<runId>/review.json`，生成 `review-summary.md`，并根据 verdict 更新 Step 状态。
- TaskPacket candidate 当前只提示使用 `import-web-plan` 或等待后续 task candidate import，不直接写入状态。
- 新增 `next-action <stepId>`，只读取 `state.json` 和当前 run 产物，按固定规则推荐下一条人工命令，不执行推荐命令，也不修改状态。
- 新增 `examples/execution-result.candidate.md`、`examples/review-result.candidate.md` 和 `examples/invalid-candidate.md` 用于验证成功与失败路径。
- 本 Step 仍不自动调用 Codex CLI / AgentChat / 网页 AI，不自动修复严重损坏的 JSON，不自动 commit / push。

详细说明见 [Step12：Candidate Import 与 Next Action Assistant](steps/step12-candidate-import-next-action.md)。

## Step9：Manual Executor Prompt 与真实 Java 项目闭环准备（已完成）

- 新增 `make-execute-prompt <stepId>`，根据当前 run 的 `task.json` 生成 `execution-request.md`。
- 提示词包含执行器角色、Step/Run 信息、必读上下文、完整 TaskPacket、scope、outOfScope、constraints、acceptanceCommands、执行规则和 ExecutionResult JSON 输出格式。
- 支持修复 run：当存在 `fix-from-review.md` 时增加 `Fix Context`，并关联上一轮 `review-summary.md` 与 `review.json`。
- 缺失 context pack 会在 prompt 中标记为 `_Not found_`，命令本身不崩溃。
- `status` 展示当前 run 的 `Execution Prompt: generated/missing`。
- 新增 `examples/execution-result.manual-codex.example.json`，用于模拟手工 Codex 执行后返回的 ExecutionResult。
- 新增真实 Java 微服务闭环试运行文档，说明 worktree 隔离、执行、审查、修复和 checkpoint 流程。
- 本阶段仍不自动调用 Codex CLI、Claude Code、AgentChat 或网页 AI，不自动修改 Java 项目，不自动 commit / push。

详细说明见 [Step9：Manual Executor Prompt 与真实 Java 项目闭环准备](steps/step9-manual-executor-prompt.md) 和 [Java 微服务项目闭环试运行](pilots/java-microservice-pilot.md)。

## Step5：ReviewResult 导入与审查流（已完成）

- 新增 `import-review <file>`，读取并校验结构化 ReviewResult JSON。
- 根据 `stepId/runId` 写入 `.agent/steps/<stepId>/runs/<runId>/review.json`。
- 自动生成 `.agent/steps/<stepId>/runs/<runId>/review-summary.md`，便于人工查看审查结论。
- 在 `.agent/steps/<stepId>/state.json` 中新增 `review` 摘要字段，记录 verdict、reviewedAt、findingsCount、highestSeverity、suggestedNextAction 和 summary。
- 将 ReviewResult verdict 映射为 Step 状态：`REVIEW_APPROVED`、`CHANGES_REQUIRED`、`REPLAN_REQUIRED`、`REVIEW_REJECTED`。
- 新增 `show-review <stepId>`，展示当前 run 的审查摘要或 review.json 简要内容。
- `status` 增强展示审查结论、finding 数量、最高严重级别和建议下一步。
- 本阶段仍不自动调用网页 AI，不自动生成 Fix Packet / Replan，不自动 commit / push，也不接入 Codex CLI / AgentChat。

详细说明见 [Step5：ReviewResult 导入与审查流](steps/step5-review-import.md)。

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

## Step8: Web Plan Import 与 Web AI Prompt Builder（已完成）

- 新增 `make-plan-prompt <goal>`，自动刷新 context pack，并生成 `.agent/generated/web-plan-request.md`。
- 新增 `import-web-plan <file>`，支持 Markdown JSON 代码块和基础 Markdown-only 解析，导入后生成 `TaskPacket`、`spec.md`、`plan.md`、`acceptance.md`、`state.json` 和 `web-plan-source.md`。
- 新增 `make-review-prompt <stepId>`，把当前 run 的 task、tests、Git evidence、diff、execution-result、checkpoint-summary 汇总成 `web-review-request.md`。
- Web AI 只负责规划和审查建议；AgentFlow 负责补齐 `protocolVersion`、`stepId`、`runId`、`createdAt`，并通过 Zod 校验后写入 `.agent/steps`。
- 本 Step 不自动调用 AgentChat、不自动调用网页 AI、不自动执行 Codex、不自动 commit / push。

详细说明见 [Step8: Web Plan Import 与 Web AI Prompt Builder](steps/step8-web-plan-prompt-builder.md) 和 [Web AI Gateway 设计](design/web-ai-gateway.md)。

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
## Step6：Fix / Replan Packet 生成（已完成）

- 新增 `create-fix <stepId>`，根据当前 Run 的 `review.json` 生成同一 Step 下的下一轮修复 Run，例如 `S001/R002`。
- 新增 `create-replan <stepId>`，在 `replan_required` 时生成 `.agent/steps/<stepId>/replan-request.md`。
- Fix Run 会生成符合 TaskPacket schema 的 `task.json`，并生成面向人和 Executor 的 `fix-from-review.md`。
- 扩展状态：`FIX_DRAFT`、`FIX_APPROVED`、`FIX_EXPORTED`、`REPLAN_DRAFT`。
- `approve` 和 `export-task` 继续使用 `state.json` 中的 `currentRunId`，因此可以自然作用于修复 Run。
- `status` 会展示 Fix 来源、当前 Run、findings 数量，以及 Replan 请求来源。
- 本阶段仍不自动调用 Codex CLI / AgentChat / Claude Code，不自动生成业务代码，不自动 commit / push。

详细说明见 [Step6：Fix / Replan Packet 生成](steps/step6-fix-replan-packet.md)。
## Step7：Checkpoint 辅助命令（已完成）

- 新增 `checkpoint <stepId>`，读取当前 Run 的 `task.json`、`tests.json`、`git.json`、`review.json` 和 `review-summary.md`。
- 生成 `.agent/steps/<stepId>/runs/<runId>/checkpoint-summary.md`，汇总目标、验证、Review、Git 证据、安全检查、缺失项、阻塞原因和下一步人工命令。
- 生成 `.agent/steps/<stepId>/runs/<runId>/commit-message.txt`，提供稳定、可复制的 commit message 建议。
- 在 `.agent/steps/<stepId>/state.json` 中新增 `checkpoint` 字段，并扩展 `CHECKPOINT_READY`、`CHECKPOINT_BLOCKED` 状态。
- `status` 会展示 checkpoint 状态；ready/warning 显示 summary 路径，blocked 显示阻塞原因数量。
- 复用 Step4 敏感文件规则：`.env`、`.env.*`、`*.pem`、`*.key`、`*.p12`、`*.jks`、`id_rsa`、`id_ed25519` 一旦出现在 Git 证据中，checkpoint 必须 blocked。
- 本阶段仍不自动 commit、不自动 push、不接入 Codex CLI / AgentChat / Claude Code，也不实现 SQLite 状态机或 PR 创建。

详细说明见 [Step7：Checkpoint 辅助命令](steps/step7-checkpoint.md)。
## Step11：Pilot Report 与冗余审查（已完成）

- 新增 `pilot-report <stepId>`，读取 `.agent/steps/<stepId>/state.json` 和所有 run 目录，生成 `.agent/steps/<stepId>/pilot-report.md`。
- 报告包含 Step Overview、Workflow Timeline、Artifact Inventory、Artifact Consumption Map、Framework Health Check、Manual Friction Points、Redundancy Candidates 和 Recommended Next Step。
- Artifact Inventory 以固定文件清单检查每个 run 下的产物是否 `exists` / `missing`，不要求所有产物都存在。
- Artifact Consumption Map 使用固定规则描述 `task.json`、`tests.json`、`git.json`、`review.json`、`fix-from-review.md` 等产物如何被后续命令消费。
- Framework Health Check 基于 `state.json` 的 review / verification / gitCheck / checkpoint 摘要做轻量判断，用于确认真实试运行是否串联。
- `status` 增加 `Pilot Report: generated/missing`。
- 本阶段仍不接入 Codex CLI / AgentChat / 网页 AI，不自动生成业务代码，不自动 commit / push。

详细说明见 [Step11：Pilot Report 与冗余审查](steps/step11-pilot-report.md)。
