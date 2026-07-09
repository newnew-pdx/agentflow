# Step11：Pilot Report 与冗余审查

## 1. 目标

Step11 的目标是新增 `pilot-report <stepId>` 命令，基于一次真实 Step 运行记录生成可读的试运行报告。它用于复盘 AgentFlow 外部框架是否已经串联，而不是执行新的开发任务。

## 2. 为什么真实试运行后需要 pilot-report

前面的步骤已经能生成 TaskPacket、Context Pack、执行提示词、测试证据、Git 证据、ReviewResult、Fix Packet 和 checkpoint 摘要。真实项目跑通一轮后，需要回答三个问题：

- 这些文件是否真的被后续流程消费。
- 哪些环节仍然依赖人工复制粘贴。
- 哪些产物可能只是辅助阅读，后续可以简化或合并。

`pilot-report` 把这些问题固化为一份 Markdown 报告，方便在继续加功能前先做框架体检。

## 3. 使用方式

开发模式下运行：

```bash
npm run dev -- pilot-report S001
```

构建后也可以运行：

```bash
node dist/index.js pilot-report S001
```

命令会读取：

```text
.agent/steps/S001/state.json
.agent/steps/S001/runs/R001/
.agent/steps/S001/runs/R002/
```

并生成：

```text
.agent/steps/S001/pilot-report.md
```

如果 Step 下存在多个 run，报告会逐个列出每个 run 的产物状态。

## 4. pilot-report.md 内容

报告包含以下部分：

- Step Overview：Step ID、当前状态、当前 run、所有 run 和目标。
- Workflow Timeline：Web Plan、TaskPacket、执行提示、ExecutionResult、验证、Git 证据、Review、checkpoint 是否出现。
- Artifact Inventory：固定产物清单的 `exists` / `missing` 表格。
- Artifact Consumption Map：说明关键产物被哪些后续命令或人工步骤消费。
- Framework Health Check：基于 `state.json` 的轻量健康检查。
- Manual Friction Points：仍需要人工复制、保存或导入的环节。
- Redundancy Candidates：可能冗余或只服务人工阅读的产物。
- Recommended Next Step：根据当前状态给出下一步建议。

## 5. 如何判断框架是否有效

本步骤只做轻量判断：

- `task.json` 能否继续驱动 `execution-request.md`、`verify` 和 review prompt。
- `tests.json` 和 `git.json` 是否作为证据进入 `web-review-request.md` 和 checkpoint。
- `review.json` 是否能影响 `state.json` 状态，并驱动 `show-review`、`create-fix`、`create-replan` 或 checkpoint。
- `checkpoint` 是否能在证据不完整时进入 blocked，而不是误判为可提交。

这些判断来自固定规则和 `state.json` 摘要，不引入复杂推理。

## 6. 如何判断可能冗余

如果一个存在的产物没有出现在固定消费规则中，报告会标记为 `possible redundancy`。当前特别关注：

- `web-plan-source.md`：主要用于人工追溯，尚未驱动核心状态流。
- `commit-message.txt`：服务人工提交，可保留，但不属于自动状态流。
- 纯 summary 文件：如果只给人看，可以保留为审计材料，但不应被误认为核心协议。

checkpoint 在 review 未 approved 时 blocked，说明它是安全门，不是冗余。

## 7. 验收命令

建议执行：

```bash
npm run build
npm run dev -- --help
npm run dev -- pilot-report S001
npm run dev -- status
```

回归验证：

```bash
npm run dev -- validate examples/task-packet.example.json
npm run dev -- validate examples/execution-result.example.json
npm run dev -- validate examples/review-result.example.json
npm run dev -- build-context
npm run dev -- checkpoint S001
```

如果 `checkpoint S001` 因 review 不是 approved 或证据缺失而 blocked，这是正常结果，不应视为失败。

## 8. 当前没有实现的内容

- 尚未自动调用 Codex CLI。
- 尚未自动调用 AgentChat。
- 尚未自动调用网页 AI。
- 尚未自动生成修复代码。
- 尚未自动修复 ReviewResult JSON 格式。
- 尚未自动 commit。
- 尚未自动 push。

## 9. 下一步建议

如果报告显示流程已经串联，但人工复制较多，可以优先优化 Manual Flow，例如 Candidate Import 或 Adapter。若执行提示词效果不稳定，先优化 `make-execute-prompt`。若 review prompt 过长，再考虑 diff 截断或摘要。若整体稳定，再评估 Codex CLI Executor 的最小接入。
