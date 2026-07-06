# AgentFlow

AgentFlow 是一个本地开发编排 CLI，目标是把依赖人工衔接的 AI 辅助开发流程逐步固化为可检查、可恢复、可追踪的工作流：

`Plan -> Approve -> Execute -> Verify -> Review -> Fix/Replan -> Commit -> Update Memory -> Next Step`

它希望解决的问题是：开发者在网页 AI、代码代理、测试工具和 Git 之间手动传递上下文时，计划、执行结果、审查意见和项目记忆容易分散或丢失。AgentFlow 将通过明确协议和本地状态连接这些阶段，同时保留开发者的审批边界。

## 当前进度：Step0

Step0 只完成项目骨架：

- 建立 TypeScript + Node.js CLI 工程；
- 使用 Commander 注册 `init`、`status`、`plan` 命令；
- 支持初始化本地 `.agent/` 工作区，且不覆盖已有内容；
- 提供基础类型、错误处理、文件工具和 Zod 协议占位；
- 支持 TypeScript 编译及编译后运行。

目前仍未实现真实 TaskPacket、Codex/AgentChat 接入、代码执行、测试审查、SQLite 状态机、Git 自动提交和项目记忆更新。

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
```

构建后也可以直接运行：

```bash
node dist/index.js --help
```

如需在本机开发期间使用 `agentflow` 命令，可以执行 `npm link`。

## Step0 验证

建议在项目根目录依次执行：

```bash
npm install
npm run build
npm run dev -- --help
npm run dev -- status
npm run dev -- init
npm run dev -- status
npm run dev -- plan "为 Java 微服务项目增加 JWT 认证"
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

当前开发的是 AgentFlow 工具本身，因此验收生成的 `.agent/` 已加入 `.gitignore`，暂不提交。更详细的说明见 [Step0：CLI 项目骨架](docs/steps/step0-cli-skeleton.md)。
