# Step2：本地记忆与 Context Pack

## 目标

Step2 的目标是让 AgentFlow 可以在当前项目中读取本地记忆文件，并生成一份给 AI 使用的上下文包。本 Step 不接入 Codex、AgentChat、Claude Code，也不实现 SQLite 状态机。

## 为什么需要本地记忆系统

AI 辅助开发的上下文经常散落在 README、项目规则、决策记录、临时计划和 Git 状态里。如果每次都手动复制这些内容，容易遗漏、过期或带入敏感信息。本地记忆系统把长期项目背景和当前状态放在固定位置，使后续任务规划和执行可以从同一套材料开始。

## `.agent/` 目录作用

```text
.agent/
|-- config.yaml
|-- project/
|   |-- vision.md
|   |-- architecture.md
|   `-- constraints.md
|-- steps/
|-- decisions/
`-- generated/
    |-- current-state.md
    `-- context-pack.md
```

- `config.yaml`：AgentFlow 项目配置。
- `project/vision.md`：项目目标、使用场景和期望效果。
- `project/architecture.md`：核心模块、技术选型、目录结构和关键流程。
- `project/constraints.md`：开发约束、安全规则、禁止事项和代码风格要求。
- `steps/`：每个 Step 的 `spec.md`、`plan.md`、`acceptance.md`。
- `decisions/`：项目决策记录。
- `generated/`：由 AgentFlow 生成的当前状态和上下文包，可以被重新生成。

## `current-state.md` 的作用

`.agent/generated/current-state.md` 是当前项目状态摘要，包含初始化状态、生成时间、Git 状态、变更文件，以及本地记忆文件是否存在、决策数量和 Step 数量。

## `context-pack.md` 的作用

`.agent/generated/context-pack.md` 是给 AI 使用的上下文包。它汇总 `AGENTS.md`、`README.md`、项目记忆、决策记录、Step 文档、Git 状态和安全过滤说明。

如果某个文件不存在，Context Pack 会写入 `_Not found._`，不会因为单个文件缺失而失败。

## 使用 `build-context`

```bash
npm run dev -- build-context
```

如果当前目录尚未初始化 `.agent/`，命令会提示先执行：

```bash
npm run dev -- init
```

## 敏感文件过滤规则

Context Builder 做路径级过滤，不读取或打包以下内容：

```text
.env
.env.*
*.pem
*.key
*.p12
*.jks
id_rsa
id_ed25519
node_modules/
dist/
target/
.git/
.agent/generated/
```

本 Step 只做路径级过滤，尚未实现内容级 secret scan。

## 验收命令

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

## 当前没有实现的内容

- 尚未根据 TaskPacket 精确选择上下文文件；
- 尚未接入 SQLite 状态机；
- 尚未自动导出任务；
- 尚未自动导入 ExecutionResult；
- 尚未接入 Codex / AgentChat；
- 尚未让 `plan` 真正调用 AI。

## 下一步建议

下一步可以实现半自动任务流，包括 `plan` 生成 TaskPacket、`export-task`、`import-result`、`status` 展示 Step 状态。
