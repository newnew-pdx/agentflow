# Step4：验证器与 Git 证据

Step4 的目标是在本地工作流中补上两个可审计环节：执行 TaskPacket 里声明的验收命令，并收集当前 Git 工作区证据。它为后续 Reviewer 和 Commit Checkpoint 做准备，但本阶段不自动 review、不自动 commit、不自动 push。

## 为什么代码生成后还需要 verify

AgentFlow 把执行任务交给人或外部执行器后，不能只相信“代码已经改完”。`verify` 把 TaskPacket 中的 `acceptanceCommands` 变成可复现记录，明确每条命令何时执行、输出是什么、是否通过、耗时多久。这样 Step 状态不是口头判断，而是由本地验收结果驱动。

## 为什么需要 Git 证据

Git 证据用于回答“这一步到底改了什么”。`git-check` 会记录当前分支、工作区状态、变更文件、diff stat 和 patch 路径。后续 Reviewer 可以基于这些证据判断变更范围，Commit Checkpoint 也可以在提交前做更严格的检查。

## `verify S001`

`verify S001` 会读取 `.agent/steps/S001/runs/R001/task.json`，使用 TaskPacket schema 校验，然后依次执行 `acceptanceCommands`。每条命令都在当前项目根目录执行，并记录：

- `command`
- `exitCode`
- `stdout`
- `stderr`
- `startedAt`
- `finishedAt`
- `durationMs`
- `status`
- `truncated`

输出会写入 `.agent/steps/S001/runs/R001/tests.json`。如果所有命令 exitCode 都是 0，Step 状态更新为 `VERIFIED`；如果任意命令失败，状态更新为 `BLOCKED`。如果 `acceptanceCommands` 为空，验证结果为 `skipped`，不会让命令崩溃。

## `tests.json` 结构

```json
{
  "stepId": "S001",
  "runId": "R001",
  "createdAt": "2026-07-08T00:00:00.000Z",
  "status": "passed",
  "commands": [
    {
      "command": "npm run build",
      "exitCode": 0,
      "status": "passed",
      "startedAt": "2026-07-08T00:00:00.000Z",
      "finishedAt": "2026-07-08T00:00:01.000Z",
      "durationMs": 1000,
      "stdout": "...",
      "stderr": "..."
    }
  ],
  "summary": {
    "total": 1,
    "passed": 1,
    "failed": 0
  }
}
```

命令输出默认最多保留 20000 个字符。超过上限时会截断并标记 `truncated: true`，避免运行产物过大。

## `git-check S001`

`git-check S001` 会读取 Step 当前 run，并执行本地 Git 检查：

- `git branch --show-current`
- `git status --short`
- `git diff --name-only`
- `git diff --stat`
- `git diff`

结果写入 `.agent/steps/S001/runs/R001/git.json`。如果存在可记录的非敏感 diff，会额外生成 `.agent/steps/S001/runs/R001/git-diff.patch`。如果当前目录不是 Git 仓库，命令不会崩溃，而是在 `git.json` 中记录 `isGitRepository: false`。

## `git.json` 结构

```json
{
  "stepId": "S001",
  "runId": "R001",
  "createdAt": "2026-07-08T00:00:00.000Z",
  "isGitRepository": true,
  "branch": "codex/work",
  "hasUncommittedChanges": true,
  "changedFiles": [
    "src/commands/verify.ts"
  ],
  "statusShort": "M README.md",
  "diffStat": "...",
  "diffPatchPath": ".agent/steps/S001/runs/R001/git-diff.patch",
  "safety": {
    "sensitiveFilesDetected": [],
    "warnings": []
  }
}
```

`state.json` 会兼容保留原有字段，并新增 `verification` 与 `gitCheck` 摘要，供 `status` 展示。

## 敏感文件风险检查

`git-check` 会检查变更路径是否命中以下模式：

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

命中后不会阻止命令执行，只会在 `git.json` 的 `safety.warnings` 中记录风险，并在控制台提示。当前实现会避免把这些文件的 diff 内容写入 `git-diff.patch`。是否强制阻止提交留到后续 Checkpoint 阶段决定。

## 为什么本 Step 不自动 commit

当前项目使用 worktree 隔离开发：

```text
agentflow        ：稳定主目录，main 分支，与远程保持一致
agentflow-codex  ：Codex 执行目录，使用 feature branch 开发
```

Codex 只在 `agentflow-codex` 中开发，稳定主目录不交给 Codex 打开。Step4 只收集验证和 Git 证据，不直接提交，避免 Git 轮询、index.lock 和误推 main 的风险。验证通过后，由开发者人工确认并合并。

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
npm run dev -- verify S001
npm run dev -- git-check S001
npm run dev -- status
npm run dev -- validate examples/task-packet.example.json
npm run dev -- validate examples/execution-result.example.json
npm run dev -- validate examples/review-result.example.json
npm run dev -- build-context
```

其中 `.agent/` 是运行产物目录，已被 `.gitignore` 忽略，不应提交。`node_modules`、`dist`、`.env` 也不应提交。

## 当前尚未实现

- 尚未自动 Review
- 尚未自动 Commit
- 尚未接入 Codex CLI
- 尚未接入 AgentChat
- 尚未实现 SQLite 状态机

## 下一步建议

后续可以实现 `ReviewResult` 导入和 review 状态，也可以实现 `checkpoint` 命令。但 commit 前应继续保留人工确认，尤其是在存在敏感文件 warning 或 diff 范围较大时。
