# Step13：Executor Gateway 最小接入

## 目标

Step13 让 AgentFlow 开始具备调用执行器的能力，但保持最小、安全、可控。新增命令：

```bash
npm run dev -- run-executor S001 --executor dry-run
npm run dev -- run-executor S001 --executor manual
npm run dev -- run-executor S001 --executor codex
```

命令会读取当前 Step 的 `state.json`，用 `currentRunId` 定位当前 run，并要求存在：

```text
.agent/steps/<stepId>/runs/<runId>/task.json
.agent/steps/<stepId>/runs/<runId>/execution-request.md
```

如果 `execution-request.md` 不存在，会提示先运行：

```bash
npm run dev -- make-execute-prompt S001
```

## 为什么需要 Executor Gateway

Step9 已经可以生成手工执行提示词，Step12 可以导入 AI 输出 candidate，但两者之间还缺少统一的执行记录。Executor Gateway 的职责是把“准备交给谁执行、执行结果在哪里、是否失败、下一步做什么”记录成稳定产物，便于后续 status、next-action、pilot-report 和人工排查消费。

Executor Gateway 不是最终裁判。它只负责执行或生成执行说明，并记录 raw output。

## 三种 Executor 的区别

### DryRunExecutor

`dry-run` 不调用任何外部命令。它会写入：

```text
.agent/steps/S001/runs/R001/executor-run.json
.agent/steps/S001/runs/R001/executor-output.md
```

输出内容说明本次将读取哪些文件、项目根目录是什么、Step/Run 是什么、将生成哪些产物。它用于验证 run-executor 命令、路径解析和记录写入链路。

### ManualExecutor

`manual` 不调用 Codex。它会读取 `execution-request.md`，把提示词路径和人工执行说明写入 `executor-output.md`。用户可以把 `execution-request.md` 复制给 Cursor / Codex / Claude Code，执行完成后把结果保存为 `executor-output.md` 或 `execution-result.candidate.md`，再运行：

```bash
npm run dev -- import-candidate <file>
```

ManualExecutor 的价值是统一 Executor Gateway 的记录格式。

### CodexCliExecutor

`codex` 是保守的最小本地 CLI 接入。默认命令为 `codex`，也可以在 `.agent/config.yaml` 配置：

```yaml
executors:
  codex:
    command: "codex"
    args: []
    timeoutMs: 600000
```

当前实现会把 `execution-request.md` 内容作为 stdin 传给配置命令，捕获 stdout、stderr 和 exit code，并写入 `executor-output.md`。不同机器上的 Codex CLI 参数可能不同，因此如需增加参数，应优先通过 `args` 配置适配。

如果命令不存在，`executor-output.md` 会写入清晰提示：

```text
Codex CLI command not found.
Configure .agent/config.yaml:
executors:
  codex:
    command: "codex"
```

## 为什么 Executor 不直接推进 Step completed

Executor 只能证明“某个执行器运行过并产生了输出”，不能证明输出满足 TaskPacket、测试通过、Git diff 合理、审查通过或可以提交。因此即使 executor 状态是 `completed`，后续仍需要：

```bash
npm run dev -- import-candidate .agent/steps/S001/runs/R001/executor-output.md
npm run dev -- verify S001
npm run dev -- git-check S001
npm run dev -- make-review-prompt S001
npm run dev -- checkpoint S001
```

`run-executor` 不会自动 commit、push、review，也不会把 Step 主状态改为 `COMPLETED`。

## executor-run.json 的作用

`executor-run.json` 是结构化记录，包含：

- stepId / runId
- executor 名称
- status：`completed`、`failed` 或 `blocked`
- exitCode
- startedAt / finishedAt / durationMs
- input.taskPath / input.executionRequestPath
- output.rawOutputPath
- warnings

`state.json` 会保存一个轻量 `executorRun` 摘要，供 `status` 展示。

## executor-output.md 的作用

`executor-output.md` 保存 raw output 或 manual/dry-run 说明。它可以作为 `import-candidate` 的输入：

```bash
npm run dev -- import-candidate .agent/steps/S001/runs/R001/executor-output.md
```

如果执行器失败，该文件也是人工排查失败原因的入口。

## status 与 next-action

`status` 会展示：

```text
Executor: dry-run, completed
Executor: codex, failed
```

`next-action` 增强规则：

- 状态为 `EXPORTED` / `FIX_EXPORTED` 且已有 `execution-request.md` 时，建议运行 `run-executor`。
- 如果已有 `executor-run.json` 但没有 `execution-result.json`，建议导入 `executor-output.md`。
- 如果 executor run 失败，展示失败状态和 warnings，并建议人工检查 `executor-output.md`。

## 验收命令

```bash
npm install
npm run build
npm run dev -- --help
npm run dev -- init
npm run dev -- build-context
npm run dev -- import-web-plan examples/web-plan.example.md
npm run dev -- approve S001
npm run dev -- export-task S001
npm run dev -- make-execute-prompt S001
npm run dev -- run-executor S001 --executor dry-run
npm run dev -- next-action S001
npm run dev -- status
npm run dev -- run-executor S001 --executor manual
npm run dev -- status
```

回归验证：

```bash
npm run dev -- validate examples/task-packet.example.json
npm run dev -- validate examples/execution-result.example.json
npm run dev -- validate examples/review-result.example.json
npm run dev -- build-context
npm run dev -- pilot-report S001
npm run dev -- checkpoint S001
```

如果 review 缺失或不是 approved，`checkpoint` blocked 是正常结果。`run-executor` 不应该自动让 checkpoint ready。

## 当前没有实现

- 尚未自动调用 AgentChat。
- 尚未自动调用网页 AI。
- 尚未自动 review。
- 尚未自动 commit。
- 尚未自动 push。
- 尚未实现完整 run-all 自动闭环。
- 尚未保证所有 Codex CLI 参数格式都兼容。

## 下一步建议

- 先用 `dry-run` / `manual` 在 Java 微服务项目中跑一轮，确认执行记录和候选导入链路顺畅。
- 再根据本地 Codex CLI 的真实命令格式调整 `.agent/config.yaml` 中的 `executors.codex.args`。
