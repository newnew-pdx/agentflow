# AgentFlow

## Step12 更新：Candidate Import 与 Next Action Assistant

当前版本新增 `import-candidate <file>` 和 `next-action <stepId>`，用于降低真实手动链路的复制与判断成本。

```bash
npm run dev -- import-candidate examples/execution-result.candidate.md
npm run dev -- import-candidate examples/review-result.candidate.md
npm run dev -- next-action S001
```

`import-candidate` 可以读取纯 JSON，也可以从 Markdown 的 ```json 代码块或普通代码块中提取 JSON。它会自动识别 ExecutionResult / ReviewResult / TaskPacket candidate；其中 ExecutionResult 和 ReviewResult 会复用现有 schema 与导入逻辑，写入当前 `.agent/steps/<stepId>/runs/<runId>/` 产物并更新 `state.json`。TaskPacket candidate 当前只提示继续使用 `import-web-plan`，不会直接写入状态。

`next-action` 只读取 `state.json` 与当前 run 产物，按固定规则建议下一条命令，不会执行推荐命令，也不会修改状态。详细说明见 [Step12 文档](docs/steps/step12-candidate-import-next-action.md)。

## Step11 更新：Pilot Report 与冗余审查

当前版本新增 `pilot-report <stepId>`，用于复盘一次真实 Step 运行记录，生成面向人工阅读的试运行报告：

```bash
npm run dev -- pilot-report S001
```

命令会读取 `.agent/steps/<stepId>/state.json` 和该 Step 下所有 `runs/<runId>/` 目录，检查 `task.json`、`execution-request.md`、`tests.json`、`git.json`、`web-review-request.md`、`review.json`、`checkpoint-summary.md` 等产物是否存在，并生成：

```text
.agent/steps/S001/pilot-report.md
```

报告包含 Step Overview、Workflow Timeline、Artifact Inventory、Artifact Consumption Map、Framework Health Check、Manual Friction Points、Redundancy Candidates 和 Recommended Next Step。它不执行开发任务，不调用 Codex CLI / AgentChat / 网页 AI，不自动 commit 或 push，只用于判断 AgentFlow 外部框架是否真正串联起来，以及哪些产物可能只服务人工阅读而不参与核心状态流。

`status` 现在会显示每个 Step 的 `Pilot Report: generated/missing`。详细说明见 [Step11 文档](docs/steps/step11-pilot-report.md)。

## Step9 更新：Manual Executor Prompt 与真实 Java 项目闭环准备

当前版本新增 `make-execute-prompt <stepId>`，用于把当前 run 的 TaskPacket、上下文清单、验收命令和执行规则转换为标准执行提示词：

```bash
npm run dev -- make-execute-prompt S001
```

命令会生成：

```text
.agent/steps/S001/runs/R001/execution-request.md
```

如果当前 run 是修复 run，例如 `R002` 且存在 `fix-from-review.md`，提示词会加入 `Fix Context`，要求执行器只修复上一轮 review findings，不扩大原始 Step 范围。`status` 现在会展示当前 run 的 `Execution Prompt: generated/missing`。

`make-execute-prompt` 不执行代码、不调用 Codex CLI、不调用 Claude Code、不修改业务项目、不自动 commit 或 push。它和 `export-task` 的区别是：`export-task` 负责状态流转和 TaskPacket 导出，`make-execute-prompt` 负责生成可复制给 Cursor / Codex / Claude Code 的执行说明。

详细说明见 [Step9 文档](docs/steps/step9-manual-executor-prompt.md) 和 [Java 微服务闭环试运行](docs/pilots/java-microservice-pilot.md)。

## Step8 更新：Web Plan Import 与 Web AI Prompt Builder

当前版本新增三条面向网页 AI / AgentChat skill 的桥接命令，但仍不自动调用网页 AI、不自动调用 AgentChat、不自动调用 Codex、不自动 commit 或 push。

常用命令：

```bash
npm run dev -- make-plan-prompt "为 Java 微服务项目增加 JWT 认证"
npm run dev -- import-web-plan examples/web-plan.example.md
npm run dev -- make-review-prompt S001
```

`make-plan-prompt` 会刷新 context pack，并生成 `.agent/generated/web-plan-request.md`，用于复制给网页 AI 生成结构化 Web Plan。`import-web-plan` 会从 Markdown JSON 代码块或基础 Markdown 标题中提取 TaskPacket JSON Candidate，由 AgentFlow 补齐 `protocolVersion`、`stepId`、`runId`、`createdAt` 并使用现有 TaskPacket schema 校验，成功后写入 `.agent/steps/<stepId>/runs/<runId>/task.json` 和 `web-plan-source.md`。`make-review-prompt` 会读取当前 run 的 `task.json`、`tests.json`、`git.json`、`git-diff.patch`、`execution-result.json`、`checkpoint-summary.md`，生成 `.agent/steps/<stepId>/runs/<runId>/web-review-request.md`，缺失证据会标记为 `_Not found_`。

核心边界：Web AI 负责规划和审查建议；Executor 负责执行；AgentFlow 负责补齐、校验、记录和控制状态。详细说明见 [Step8 文档](docs/steps/step8-web-plan-prompt-builder.md) 与 [Web AI Gateway 设计](docs/design/web-ai-gateway.md)。
## Step7 更新：Checkpoint 辅助命令

当前版本新增 `checkpoint <stepId>`，用于在人工提交前汇总当前 Run 的验证、Git 证据和 Review 结果，并生成可读的 checkpoint 摘要与 commit message 建议。本步骤仍不接入 Codex CLI、Claude Code、AgentChat，不自动调用网页 AI，不自动 commit，也不自动 push。

常用命令：
```bash
npm run dev -- verify S001
npm run dev -- git-check S001
npm run dev -- import-review examples/review-result.s001-r001.approved.example.json
npm run dev -- checkpoint S001
npm run dev -- status
```

`checkpoint S001` 会读取 `.agent/steps/S001/state.json` 中的 `currentRunId`，聚合对应 Run 目录下的 `task.json`、`tests.json`、`git.json`、`review.json` 和 `review-summary.md`。缺失的非入口文件不会让命令崩溃，而是写入摘要的 missing item 与阻塞/警告原因。

命令会生成：
```text
.agent/steps/S001/runs/R001/checkpoint-summary.md
.agent/steps/S001/runs/R001/commit-message.txt
```

`state.json` 会新增 `checkpoint` 摘要字段，记录 `status`、`checkedAt`、`runId`、`summaryPath`、`commitMessagePath`、`blockingReasons` 和 `warnings`。`status` 命令会展示 checkpoint 状态；ready 时展示 summary 路径，blocked 时展示阻塞原因数量。

完整说明见 [Step7：Checkpoint 辅助命令](docs/steps/step7-checkpoint.md)。

## Step6 更新：Fix / Replan Packet 生成

当前版本新增 `create-fix <stepId>` 和 `create-replan <stepId>`。它们根据当前 Run 的 ReviewResult 生成下一轮修复任务或重新规划请求，但仍不接入 Codex CLI、Claude Code、AgentChat，不自动调用网页 AI，不自动生成业务代码，不自动 commit，也不自动 push。

常用命令：
```bash
npm run dev -- import-review examples/review-result.s001-r001.changes-required.example.json
npm run dev -- create-fix S001
npm run dev -- validate .agent/steps/S001/runs/R002/task.json
npm run dev -- approve S001
npm run dev -- export-task S001
npm run dev -- status
```

`create-fix S001` 会读取 `state.json` 中的 `currentRunId`，在同一个 Step 下创建下一个 Run，例如 `R002`，并生成 `.agent/steps/S001/runs/R002/task.json` 与 `fix-from-review.md`。状态会进入 `FIX_DRAFT`，后续 `approve` 和 `export-task` 会继续作用于当前 Run。

`create-replan S001` 会在 verdict 为 `replan_required` 时生成 `.agent/steps/S001/replan-request.md`，并将状态更新为 `REPLAN_DRAFT`，不会创建新的 TaskPacket，也不会自动修改原始计划。

完整说明见 [Step6：Fix / Replan Packet 生成](docs/steps/step6-fix-replan-packet.md)。

## Step5 更新：ReviewResult 导入与审查流

当前版本新增结构化审查结果导入，不接入 Codex CLI、Claude Code、AgentChat，也不会自动调用网页 AI、生成修复代码、commit 或 push。

常用命令：

```bash
npm run dev -- import-review examples/review-result.s001-r001.changes-required.example.json
npm run dev -- show-review S001
npm run dev -- status
```

`import-review <file>` 会校验 ReviewResult JSON，根据 `stepId/runId` 写入 `.agent/steps/S001/runs/R001/review.json`，生成 `.agent/steps/S001/runs/R001/review-summary.md`，并把 verdict 摘要写入 `.agent/steps/S001/state.json`。verdict 会映射为 Step 状态：`approved -> REVIEW_APPROVED`、`changes_required -> CHANGES_REQUIRED`、`replan_required -> REPLAN_REQUIRED`、`rejected -> REVIEW_REJECTED`。

`show-review S001` 会优先展示当前 run 的 `review-summary.md`；如果摘要不存在，则读取 `review.json` 做简要展示。`status` 现在会显示审查结论、finding 数量、最高严重级别和建议下一步。

完整说明见 [Step5：ReviewResult 导入与审查流](docs/steps/step5-review-import.md)。
## Step4 更新：验证器与 Git 证据

当前版本新增本地验证和 Git 证据采集，不接入 Codex CLI、Claude Code 或 AgentChat，也不会自动 commit / push。

常用命令：

```bash
npm run dev -- verify S001
npm run dev -- git-check S001
npm run dev -- status
```

`verify S001` 会读取 `.agent/steps/S001/runs/R001/task.json`，校验 TaskPacket，并依次执行 `acceptanceCommands`。结果写入 `.agent/steps/S001/runs/R001/tests.json`，同时把 `state.json` 更新为 `VERIFIED` 或 `BLOCKED`，并记录通过、失败和跳过摘要。

`git-check S001` 会采集当前分支、工作区状态、变更文件、diff stat 和 patch。结果写入 `.agent/steps/S001/runs/R001/git.json`，可生成 `.agent/steps/S001/runs/R001/git-diff.patch`。如果变更路径命中 `.env`、`.env.*`、`*.pem`、`*.key`、`*.p12`、`*.jks`、`id_rsa` 或 `id_ed25519`，命令只记录风险提示，并避免把这些文件的 diff 内容写入 patch。

推荐开发隔离策略：

```text
agentflow        ：稳定主目录，main 分支，与远程保持一致
agentflow-codex  ：Codex 执行目录，使用 feature branch 开发
```

Codex 只在 `agentflow-codex` worktree 中开发；稳定主目录 `agentflow` 不交给 Codex 打开。验证通过后再由开发者人工合并到 `main`，不要让 Codex 直接 push `main`。

完整说明见 [Step4：验证器与 Git 证据](docs/steps/step4-verifier-git-evidence.md)。

## Step3 更新：半自动任务流

当前版本已完成 Step3：AgentFlow 可以通过文件系统串联 `plan -> approve -> export-task -> import-result -> status`。

常用命令：

```bash
npm run dev -- init
npm run dev -- build-context
npm run dev -- plan "为 Java 微服务项目增加 JWT 认证"
npm run dev -- validate .agent/steps/S001/runs/R001/task.json
npm run dev -- approve S001
npm run dev -- export-task S001
npm run dev -- import-result examples/execution-result.s001-r001.example.json
npm run dev -- status
```

Step 数据保存在 `.agent/steps/` 下，例如 `.agent/steps/S001/runs/R001/task.json`。本阶段仍不自动调用 Codex、Claude Code、AgentChat，不自动 Review、Commit 或 Push，也不引入 SQLite 状态机。

推荐开发方式：

```text
agentflow        ：稳定主目录，main 分支，与远程保持一致
agentflow-codex  ：Codex 执行目录，使用 feature branch 开发
```

Codex 只在 `agentflow-codex` 中工作；主目录 `agentflow` 不交给 Codex 打开，以避免 Git 锁冲突。每个 Step 在 worktree 中开发、验证和提交，验证通过后再合并到 `main`，不要让 Codex 直接 push `main`。

完整说明见 [Step3：半自动任务流](docs/steps/step3-semi-auto-workflow.md)。

## Step2 更新：本地记忆与 Context Pack

当前版本已经完成 Step2：AgentFlow 可以维护 `.agent/generated/current-state.md`，并通过 `build-context` 生成 `.agent/generated/context-pack.md`。

新增能力：

- `init` 会补齐 `.agent/project/`、`.agent/steps/`、`.agent/decisions/`、`.agent/generated/`，不会覆盖已有用户文件；
- 如果根目录缺少 `AGENTS.md`，`init` 会创建中文基础模板；
- `build-context` 会读取 `AGENTS.md`、`README.md`、项目愿景、架构、约束、决策记录和 Step 文档；
- `build-context` 会汇总 Git 分支、工作区状态和变更文件；当前目录不是 Git 仓库时不会失败；
- Context Pack 会对 `.env`、密钥文件、依赖目录和生成目录做路径级敏感过滤。

常用命令：

```bash
npm install
npm run build
npm run dev -- --help
npm run dev -- status
npm run dev -- init
npm run dev -- build-context
npm run dev -- status
npm run dev -- validate examples/task-packet.example.json
npm run dev -- validate examples/execution-result.example.json
npm run dev -- validate examples/review-result.example.json
```

生成文件：

```text
.agent/generated/current-state.md
.agent/generated/context-pack.md
```

最新说明见 [Step2：本地记忆与 Context Pack](docs/steps/step2-local-memory-context.md)。

AgentFlow 是一个本地开发编排 CLI，目标是把依赖人工衔接的 AI 辅助开发流程逐步固化为可检查、可恢复、可追踪的工作流：

`Plan -> Approve -> Execute -> Verify -> Review -> Fix/Replan -> Commit -> Update Memory -> Next Step`

它希望解决的问题是：开发者在网页 AI、代码代理、测试工具和 Git 之间手动传递上下文时，计划、执行结果、审查意见和项目记忆容易分散或丢失。AgentFlow 将通过明确协议和本地状态连接这些阶段，同时保留开发者的审批边界。

## 当前进度：Step1

Step0 已完成 CLI 骨架，Step1 新增任务与反馈协议：

- 建立 TypeScript + Node.js CLI 工程；
- 使用 Commander 注册 `init`、`status`、`plan` 命令；
- 支持初始化本地 `.agent/` 工作区，且不覆盖已有内容；
- 定义 `TaskPacket`、`ExecutionResult` 和 `ReviewResult`；
- 提供 TypeScript 类型、Zod 运行时校验和协议自动识别；
- 使用 `validate` 命令校验协议 JSON，并提供有效与无效样例；
- 支持 TypeScript 编译及编译后运行。

目前仍未实现真实 TaskPacket 生成、Codex/AgentChat 接入、代码执行、SQLite 状态机、Git 自动提交和项目记忆更新。

## 环境要求

- Node.js 20 或更高版本
- npm

## 安装和运行

```bash
npm install
npm run build
npm run dev -- --help
npm run dev -- init
npm run dev -- status
npm run dev -- plan "为 Java 微服务项目增加 JWT 认证"
npm run dev -- validate examples/task-packet.example.json
```

构建后也可以直接运行：

```bash
node dist/index.js --help
```

如需在本机开发期间使用 `agentflow` 命令，可以执行 `npm link`。

## Step1 验证

建议在项目根目录依次执行：

```bash
npm install
npm run build
npm run dev -- --help
npm run dev -- status
npm run dev -- init
npm run dev -- status
npm run dev -- plan "为 Java 微服务项目增加 JWT 认证"
npm run dev -- validate examples/task-packet.example.json
npm run dev -- validate examples/execution-result.example.json
npm run dev -- validate examples/review-result.example.json
node dist/index.js --help
```

初始化前的 `status` 应提示尚未初始化；执行 `init` 后再次运行，应显示项目已初始化且 Steps 为 0。若 `.agent` 已存在，`init` 不会覆盖已有内容。

## `.agent` 工作区

```text
.agent/
|-- config.yaml
|-- project/
|   |-- vision.md
|   |-- architecture.md
|   `-- constraints.md
|-- steps/
|-- decisions/
|-- generated/
|-- current-state.md
`-- context-pack.md
```

当前开发的是 AgentFlow 工具本身，因此验收生成的 `.agent/` 已加入 `.gitignore`，暂不提交。协议设计和命令用法见 [Step1：任务与反馈协议](docs/steps/step1-protocols.md)，初始骨架见 [Step0：CLI 项目骨架](docs/steps/step0-cli-skeleton.md)。
