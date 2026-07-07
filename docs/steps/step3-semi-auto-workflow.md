# Step3：半自动任务流

Step3 的目标是在不接入外部执行器的前提下，用文件系统把一次任务从计划、审批、导出、结果导入到状态查看串起来。当前流程是：

```text
plan -> approve -> export-task -> import-result -> status
```

## 为什么先做半自动任务流

AgentFlow 最终会连接 Codex、AgentChat 或其他执行器，但直接接入执行器会同时引入权限、状态机、日志、重试和 Git 边界等复杂度。Step3 先用 `.agent/steps/` 保存状态，让人工可以检查每个交接文件，也让 TaskPacket 和 ExecutionResult 协议先稳定下来。

当前 Step 不会自动调用 Codex、Claude Code 或 AgentChat，也不会自动执行测试、自动 Review、自动 Commit 或自动 Push。

## 命令职责

- `plan "目标"`：生成新的 Step 目录、初始文档、`state.json` 和 `runs/R001/task.json`。
- `approve S001`：把 Step 状态更新为 `APPROVED`，并记录 `approvedAt`。
- `export-task S001`：输出当前 Run 的 `task.json` 路径，并把状态更新为 `EXPORTED`。如果尚未审批会提示 warning，但 Step3 不强制失败。
- `import-result <file>`：校验 ExecutionResult，保存到对应 Run，并根据执行结果更新状态。
- `status`：展示当前 Step 数量、每个 Step 的状态、目标、Run 和 ExecutionResult 摘要。

## 目录结构

```text
.agent/
└── steps/
    └── S001/
        ├── spec.md
        ├── plan.md
        ├── acceptance.md
        ├── state.json
        └── runs/
            └── R001/
                ├── task.json
                └── execution-result.json
```

## state.json 字段

- `stepId`：Step 编号，例如 `S001`。
- `status`：当前状态，可为 `DRAFT`、`APPROVED`、`EXPORTED`、`RESULT_IMPORTED`、`BLOCKED`、`COMPLETED`。
- `goal`：用户在 `plan` 中输入的目标。
- `currentRunId`：当前 Run 编号，例如 `R001`。
- `createdAt`：Step 创建时间。
- `updatedAt`：最后更新时间。
- `approvedAt`：审批时间，仅审批后存在。
- `exportedAt`：导出时间，仅导出后存在。
- `importedAt`：结果导入时间，仅导入后存在。
- `executionResult`：导入 ExecutionResult 后的摘要，包含执行状态、建议下一步和变更文件数量。

## TaskPacket 与 ExecutionResult 如何串联

`plan` 会生成符合 Step1 TaskPacket schema 的 `task.json`。人工或外部执行器读取这个文件完成任务后，产出符合 ExecutionResult schema 的 JSON。`import-result` 根据 ExecutionResult 中的 `stepId` 和 `runId` 找到 `.agent/steps/S001/runs/R001/`，保存规范化后的 `execution-result.json`，再更新 Step 状态。

当 ExecutionResult 的 `status` 为 `completed` 时，Step 状态更新为 `RESULT_IMPORTED`；当 `status` 为 `failed` 或 `blocked` 时，Step 状态更新为 `BLOCKED`。

## 验收命令

```bash
npm install
npm run build
npm run dev -- --help
npm run dev -- init
npm run dev -- build-context
npm run dev -- plan "为 Java 微服务项目增加 JWT 认证"
npm run dev -- validate .agent/steps/S001/runs/R001/task.json
npm run dev -- approve S001
npm run dev -- export-task S001
npm run dev -- import-result examples/execution-result.s001-r001.example.json
npm run dev -- status
```

回归协议与上下文命令：

```bash
npm run dev -- validate examples/task-packet.example.json
npm run dev -- validate examples/execution-result.example.json
npm run dev -- validate examples/review-result.example.json
npm run dev -- build-context
```

## 当前未实现

- 尚未自动调用 Codex。
- 尚未自动调用 Claude Code 或 AgentChat。
- 尚未自动 Review。
- 尚未自动 Commit 或 Push。
- 尚未实现 SQLite 状态机。
- 尚未实现多轮 Fix/Replan。

## worktree 开发方式

推荐保持两个目录：

```text
agentflow        ：稳定主目录，main 分支，与远程保持一致
agentflow-codex  ：Codex 执行目录，使用 feature branch 开发
```

Codex 只在 `agentflow-codex` 中工作。主目录 `agentflow` 不交给 Codex 打开，以避免 Git 锁冲突。每个 Step 在 worktree 中开发、验证和提交，验证通过后再合并到 `main`，不要让 Codex 直接 push `main`。

## 下一步建议

下一步可以先把验证结果固化为 Git 检查点，或者实现轻量级 ReviewResult 导入，让 `ExecutionResult -> ReviewResult` 的交接也有本地文件记录。
