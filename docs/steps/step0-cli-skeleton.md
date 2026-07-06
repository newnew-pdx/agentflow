# Step0：CLI 项目骨架

## 目标

Step0 的目标是建立一个可以安装、编译、运行和继续扩展的 AgentFlow CLI 项目。本阶段只验证工程骨架和最小命令链路，不实现 AI 编排、数据库状态机或自动提交等复杂能力。

完成后应具备 TypeScript + Node.js 工程、清晰分层的 CLI 入口、非覆盖式 `.agent/` 初始化能力，以及可直接运行的 JavaScript 构建产物。

## 为什么先做 CLI 骨架

AgentFlow 最终需要连接规划、审批、代码执行、测试验证、审查、Git 和项目记忆。如果一开始同时接入所有组件，协议、状态和错误边界会一起变化，很难定位问题。

CLI 骨架先提供稳定入口，明确命令组织、本地工作区、文件安全写入、构建运行方式，以及后续协议和状态模块的位置。它是未来功能的承载层，不是完整 AgentFlow 的简化演示。

## 核心目录结构

```text
agentflow/
|-- package.json
|-- tsconfig.json
|-- README.md
|-- src/
|   |-- index.ts
|   |-- cli.ts
|   |-- commands/
|   |   |-- init.ts
|   |   |-- status.ts
|   |   `-- plan.ts
|   |-- core/
|   |   |-- types.ts
|   |   `-- errors.ts
|   |-- protocols/index.ts
|   `-- utils/
|       |-- fs.ts
|       `-- path.ts
`-- docs/
    |-- vision.md
    |-- roadmap.md
    `-- steps/step0-cli-skeleton.md
```

执行 `agentflow init` 后，当前目录会生成：

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

## 当前命令及预期行为

### `agentflow --help`

显示 AgentFlow 的用途、版本选项和命令列表。通过开发脚本运行时使用 `npm run dev -- --help`，输出中应包含 `init`、`status` 和 `plan`。

### `agentflow init`

在当前目录创建完整的 `.agent/` 工作区及模板文件。若 `.agent/` 已存在，应提示已经初始化，不覆盖、补写或删除其中的任何内容。

### `agentflow status`

检测当前目录是否存在 `.agent/`。未初始化时提示运行 `agentflow init`；初始化后输出项目已检测、状态为 `initialized`，并统计 `.agent/steps/` 的条目数，初始值为 0。

### `agentflow plan "目标"`

接收并原样打印目标，然后明确提示 TaskPacket 生成功能仍是占位。该命令当前不会调用模型或生成真实协议文件。

示例：

```bash
npm run dev -- plan "为 Java 微服务项目增加 JWT 认证"
```

## 验收步骤

在 `agentflow/` 根目录依次执行：

```bash
npm install
npm run build
npm run dev -- --help
npm run dev -- status
npm run dev -- init
npm run dev -- status
npm run dev -- plan "为 Java 微服务项目增加 JWT 认证"
```

预期结果：

1. npm 成功安装依赖；
2. TypeScript 编译成功并生成 `dist/`；
3. 帮助信息列出三个 Step0 命令；
4. 初始化前的 `status` 提示尚未初始化；
5. `init` 创建完整 `.agent/` 结构；
6. 初始化后的 `status` 显示 `Current status: initialized` 和 `Steps: 0`；
7. `plan` 打印中文目标和占位提示。

还可以运行 `node dist/index.js --help` 验证编译入口，再次运行 `npm run dev -- init` 验证初始化的幂等保护。

## 当前未实现

- 尚未生成真正的 TaskPacket；
- 尚未定义完整的 ExecutionResult 和 ReviewResult；
- 尚未接入 Codex；
- 尚未接入 AgentChat；
- 尚未执行或修改业务代码；
- 尚未自动运行测试和审查；
- 尚未实现 SQLite 状态机；
- 尚未实现 Git 自动提交和长期项目记忆更新。

当前 `src/protocols/`、Zod 依赖和部分核心类型只是后续扩展的预留位置。

## Step1 计划

Step1 将定义 `TaskPacket`、`ExecutionResult`、`ReviewResult` 协议，并为它们增加 Zod Schema 和运行时校验，同时补充有效、无效协议样例的基础测试。目标是先让阶段间的数据契约清晰、可验证，再接入 Codex、AgentChat 和 SQLite 状态流转。
