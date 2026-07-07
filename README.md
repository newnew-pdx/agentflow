# AgentFlow

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
