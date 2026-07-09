# Step7：Checkpoint 辅助命令

Step7 的目标是在人工提交前增加一个轻量、安全、可追踪的检查点。它不会替开发者提交代码，而是把当前 Step/Run 的验证结果、Git 证据、Review 结论和敏感文件风险汇总到本地文件中，帮助开发者判断是否可以进入手动 commit。

## 为什么需要 checkpoint

在 Step4 到 Step6 之后，AgentFlow 已经能保存验证结果、Git 证据、ReviewResult，并能根据 Review 生成 Fix/Replan Packet。但真正提交前仍需要一个“最后看一眼”的汇总层：测试是否通过、Review 是否 approved、Git 是否有可提交变更、是否误带 `.env` 或密钥文件、提交信息是否有一个稳定建议。

checkpoint 就承担这个提交前安全检查角色。它只读取已有产物并生成摘要，不重新执行外部 AI，不修改业务代码，也不执行 Git 提交。

## 为什么本 Step 不自动 commit

commit 是项目历史边界，应该由开发者人工确认。当前阶段只生成建议，避免把未审阅的变更、敏感文件路径或错误 Review 状态自动写入仓库历史。后续即使实现更强的自动化，也应继续保留人工确认边界。

## 使用方式

```bash
npm run dev -- checkpoint S001
```

命令会读取 `.agent/steps/S001/state.json` 中的 `currentRunId`。如果当前 Run 是 `R001`，则读取 `.agent/steps/S001/runs/R001/`；如果 Step 已进入修复 Run，例如 `R002`，则自然读取 `.agent/steps/S001/runs/R002/`。

## 读取的文件

checkpoint 会尽量读取以下文件：

```text
task.json
tests.json
git.json
review.json
review-summary.md
```

如果某些文件缺失，命令不会直接崩溃，而是把缺失项写入 `checkpoint-summary.md`。关键证据缺失会让 checkpoint 进入 `blocked`，非关键摘要缺失会进入 `warning`。

## checkpoint-summary.md

命令会生成 `.agent/steps/S001/runs/R001/checkpoint-summary.md`。摘要包含 Step ID、Run ID、checkpoint status、检查时间、TaskPacket goal、Verification、Review、Git evidence、安全检查、missing items、warnings、blocking reasons、Suggested Commit Message 和下一步人工 Git 命令。

## commit-message.txt

命令会生成 `.agent/steps/S001/runs/R001/commit-message.txt`，保存一行稳定的 commit message 建议。生成规则保持轻量：checkpoint 相关变更优先生成 `step7: add checkpoint readiness summary`；JWT 目标生成类似 `S001: implement JWT authentication`；无法稳定推断时回退为 `checkpoint: complete S001`。

## ready / blocked / warning 规则

满足以下条件时，checkpoint 为 `ready`：`tests.json` 存在且 `status` 为 `passed`，`review.json` 存在且 `verdict` 为 `approved`，`git.json` 存在且 `isGitRepository` 为 `true`，没有敏感文件，并且 Git 证据中存在 changed files。

出现以下情况时，checkpoint 为 `blocked`：`tests.json` 缺失或未通过，`review.json` 缺失或 verdict 不是 `approved`，`git.json` 缺失，当前目录不是 Git 仓库，或 Git 证据检测到敏感文件路径。

以下情况会进入或保留 `warning`：测试通过且 Review approved，但没有 changed files；`review-summary.md` 等非关键摘要文件缺失；文件可读性存在非关键警告。

## 敏感文件检查规则

checkpoint 复用 Step4 的 Git 证据安全规则。以下路径或后缀一旦出现在 changed files 或 `git.json.safety.sensitiveFilesDetected` 中，checkpoint 必须 blocked：

```text
.env
.env.*
*.pem
*.key
*.p12
*.jks
id_rsa
id_ed25519
```

checkpoint 不读取这些文件内容，不把敏感文件 diff 写入摘要，只记录文件名和风险提示。

## state.json 增强

`state.json` 会新增：

```json
{
  "checkpoint": {
    "status": "ready",
    "checkedAt": "2026-07-09T00:00:00.000Z",
    "runId": "R001",
    "summaryPath": ".agent/steps/S001/runs/R001/checkpoint-summary.md",
    "commitMessagePath": ".agent/steps/S001/runs/R001/commit-message.txt",
    "blockingReasons": [],
    "warnings": []
  }
}
```

当 checkpoint 为 `ready` 时，Step 主状态更新为 `CHECKPOINT_READY`。当 checkpoint 为 `blocked` 时，Step 主状态更新为 `CHECKPOINT_BLOCKED`。`warning` 会保留原主状态，仅更新 `checkpoint` 字段。

## status 展示

`status` 会展示 checkpoint 摘要。例如 `Checkpoint: ready, summary: .agent/steps/S001/runs/R001/checkpoint-summary.md`。如果 blocked，则展示 `Checkpoint: blocked, reasons: 2`。

## 验收命令

```bash
npm run build
npm run dev -- --help
npm run dev -- init
npm run dev -- build-context
npm run dev -- plan "为 Java 微服务项目增加 JWT 认证"
npm run dev -- approve S001
npm run dev -- export-task S001
npm run dev -- verify S001
npm run dev -- git-check S001
npm run dev -- import-review examples/review-result.s001-r001.approved.example.json
npm run dev -- checkpoint S001
npm run dev -- status
```

blocked 场景可以使用：

```bash
npm run dev -- plan "测试 checkpoint blocked"
npm run dev -- approve S002
npm run dev -- export-task S002
npm run dev -- verify S002
npm run dev -- git-check S002
npm run dev -- import-review examples/review-result.s002-r001.changes-required.example.json
npm run dev -- checkpoint S002
npm run dev -- status
```

回归验证：

```bash
npm run dev -- validate examples/task-packet.example.json
npm run dev -- validate examples/execution-result.example.json
npm run dev -- validate examples/review-result.example.json
npm run dev -- build-context
npm run dev -- create-fix S002
```

## 当前没有实现

- 尚未自动 commit。
- 尚未自动 push。
- 尚未接入 Codex CLI。
- 尚未接入 AgentChat。
- 尚未接入 Claude Code。
- 尚未实现远程分支或 PR 检查。
- 尚未实现 SQLite 状态机。

## 下一步建议

- 实现 Web Plan Import。
- 实现 Web Review Prompt Builder。
- 尽快在真实 Java 微服务项目上跑闭环。

## 工作树隔离

继续保持隔离策略：

```text
agentflow        ：稳定主目录，main 分支，与远程保持一致
agentflow-codex  ：Codex 执行目录，使用 feature branch 开发
```

Codex 只在 `agentflow-codex` worktree 中开发。稳定主目录 `agentflow` 不交给 Codex 打开；验证通过后再人工合并到 `main`，不要让 Codex 直接 push `main`。
