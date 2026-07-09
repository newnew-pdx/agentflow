# Step8: Web Plan Import 与 Web AI Prompt Builder

Step8 的目标是在 AgentFlow 侧建立 Web AI 输入/输出接口：本地 CLI 负责生成规划 prompt、导入 Web AI 规划结果、生成审查 prompt。它不自动调用网页 AI，不集成 AgentChat 的 Chrome CDP/runtime，也不自动执行 Codex。

之所以先做 Prompt Builder / Import，是为了把边界固定下来：AI 负责想，Executor 负责做，AgentFlow 负责验、记、控。Web AI 可以给出计划和审查建议，但所有进入项目状态的内容必须先经过 AgentFlow 的 import、normalize 和 Zod validate。

## make-plan-prompt

`make-plan-prompt "<goal>"` 会检查 `.agent/` 是否存在，自动刷新 context pack，并生成：

```text
.agent/generated/web-plan-request.md
```

该文件用于复制给网页 AI，或交给后续 AgentChat skill 使用。Prompt 会明确要求 Web AI 输出 Web Plan 和 TaskPacket JSON Candidate，并说明 `protocolVersion`、`stepId`、`runId`、`createdAt` 由 AgentFlow 补齐。

## import-web-plan

`import-web-plan <file>` 读取 Web AI 产出的 Markdown。它优先提取 JSON 代码块中的 TaskPacket JSON Candidate；如果没有 JSON，则按 `## Goal`、`## Scope`、`## Out of Scope`、`## Acceptance Commands`、`## Constraints` 做基础 Markdown 解析。

导入成功后会生成下一组 Step/Run，例如：

```text
.agent/steps/S001/spec.md
.agent/steps/S001/plan.md
.agent/steps/S001/acceptance.md
.agent/steps/S001/state.json
.agent/steps/S001/runs/R001/task.json
.agent/steps/S001/runs/R001/web-plan-source.md
```

AgentFlow 会补齐：

- `protocolVersion = agentflow.v1`
- `stepId`
- `runId`
- `createdAt`

随后使用 TaskPacket schema 校验；校验失败时不会写入 `.agent/steps`。

## make-review-prompt

`make-review-prompt S001` 根据当前 run 生成：

```text
.agent/steps/S001/runs/R001/web-review-request.md
```

Prompt 会汇总 `task.json`、`tests.json`、`git.json`、`git-diff.patch`、`execution-result.json`、`checkpoint-summary.md`。缺失证据写为 `_Not found_`；过长 diff 会截断并标明；`git.json` 中的 sensitive warnings 会单独突出显示。

## 与 AgentChat Skill 的关系

本 Step 只产出可复制的 prompt 和可导入的协议文件。后续可以把 AgentChat skill 作为 Web AI Provider：AgentFlow 生成 prompt，AgentChat 负责把 prompt 送到网页 AI，返回的 plan/review 仍然必须通过 `import-web-plan` 或 `import-review` 进入 AgentFlow。

## 验收命令

```bash
npm run build
npm run dev -- --help
npm run dev -- init
npm run dev -- build-context
npm run dev -- make-plan-prompt "为 Java 微服务项目增加 JWT 认证"
npm run dev -- import-web-plan examples/web-plan.example.md
npm run dev -- validate .agent/steps/S001/runs/R001/task.json
npm run dev -- approve S001
npm run dev -- export-task S001
npm run dev -- verify S001
npm run dev -- git-check S001
npm run dev -- make-review-prompt S001
npm run dev -- status
```

## 尚未实现

- 尚未自动调用 AgentChat。
- 尚未自动调用网页 AI。
- 尚未自动修复 AI 输出 JSON。
- 尚未自动执行 Codex。

下一步建议在真实 Java 微服务项目上跑通 `Web Plan -> Codex 执行 -> Web Review` 闭环，再考虑 `AgentChatSkillAdapter`。
