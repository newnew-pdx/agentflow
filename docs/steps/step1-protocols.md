# Step1：任务与反馈协议

## 目标

Step1 建立 Planner、Executor 和 Reviewer 之间传递信息的结构化协议。三类协议既提供 TypeScript 类型，也使用 Zod 在运行时校验；`agentflow validate <file>` 可以识别并校验独立 JSON 文件。

先固定协议层，可以让规划、执行和审查组件在尚未接入时就拥有清晰边界。后续替换具体代理或状态存储时，只要遵守协议，就不必同时改动整个工作流。

## 三类协议

### TaskPacket

Planner 交给 Executor 的任务包。核心字段包括版本 `protocolVersion`、步骤与运行标识 `stepId`/`runId`、目标 `goal`、范围 `scope`/`outOfScope`、上下文文件、约束、验收命令、审批要求和创建时间。

### ExecutionResult

Executor 完成尝试后的结构化反馈。它记录执行状态、摘要、改动文件、测试结果、偏差、阻塞项、剩余风险和建议下一动作，使 Reviewer 不必从零散终端输出猜测执行情况。

### ReviewResult

Reviewer 对代码差异、测试和执行结果的审查结论。它包含 verdict、摘要、分级 findings 以及下一动作；每条 finding 可以指向文件并给出必须修复的内容。

三类协议共用 `agentflow.v1`、`S001` 形式的 stepId、ISO 时间和严重级别。ExecutionResult 与 ReviewResult 必须带 `R001` 形式的 runId；TaskPacket 的 runId 可选。

## validate 命令

```bash
npm run dev -- validate examples/task-packet.example.json
npm run dev -- validate examples/execution-result.example.json
npm run dev -- validate examples/review-result.example.json
```

命令根据特征字段自动识别协议。成功时输出协议类型、stepId、可用的 runId 和 `validation passed`；失败时输出字段路径与原因。JSON 语法错误和文件不存在也会得到简短提示，并以非零状态退出。

## 验收命令

```bash
npm install
npm run build
npm run dev -- --help
npm run dev -- validate examples/task-packet.example.json
npm run dev -- validate examples/execution-result.example.json
npm run dev -- validate examples/review-result.example.json
npm run dev -- validate examples/invalid-task-packet.example.json
```

最后一个命令预期校验失败，用于确认错误字段会被拒绝。

## 当前边界与下一步

本 Step 尚未真正生成 TaskPacket，尚未把任务导出给 Cursor/Codex，尚未把 ExecutionResult 导入状态机，也尚未接入 AgentChat 或 Codex 自动执行。

Step2 建议建立 `.agent/` 本地记忆系统和 context-pack 生成能力。
