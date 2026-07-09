# Step12：Candidate Import 与 Next Action Assistant

## 目标

Step12 解决真实手动链路里的两个摩擦点：

- AI 输出经常是 Markdown、解释文字和 JSON 混合在一起，用户不应手动复制 JSON。
- Step 状态和 run 产物变多以后，用户不应反复判断下一条命令是什么。

本步骤新增：

```bash
npm run dev -- import-candidate <file>
npm run dev -- next-action S001
```

## 为什么需要 import-candidate

`import-result` 和 `import-review` 需要纯 JSON 文件，但 Codex、Cursor、网页 AI 或 AgentChat 的原始输出常常包含说明文字与 fenced code block。`import-candidate` 会从原始输出中提取 JSON 候选，自动识别协议类型，并在校验通过后复用现有导入逻辑。

它支持：

- 整个文件就是 JSON。
- Markdown 中的 ```json 代码块。
- 没有语言标记的普通代码块。
- 多个代码块时，优先选择最像 AgentFlow 协议的 JSON。

识别规则是轻量规则：

- 有 `status` 和 `filesChanged`：ExecutionResult。
- 有 `verdict` 和 `findings`：ReviewResult。
- 有 `goal` 和 `scope`：TaskPacket candidate。

TaskPacket candidate 当前只提示使用 `import-web-plan`，不直接写入状态。

## ExecutionResult Candidate 导入

```bash
npm run dev -- import-candidate examples/execution-result.candidate.md
```

命令会提取 JSON，使用 ExecutionResult schema 校验，通过后写入：

```text
.agent/steps/S001/runs/R001/execution-result.json
```

并更新 `.agent/steps/S001/state.json` 中的执行摘要。成功后会建议继续运行：

```bash
npm run dev -- verify S001
npm run dev -- git-check S001
```

## ReviewResult Candidate 导入

```bash
npm run dev -- import-candidate examples/review-result.candidate.md
```

命令会提取 JSON，使用 ReviewResult schema 校验，通过后写入：

```text
.agent/steps/S001/runs/R001/review.json
.agent/steps/S001/runs/R001/review-summary.md
```

并根据 verdict 更新 Step 状态。`changes_required` 会建议：

```bash
npm run dev -- show-review S001
npm run dev -- create-fix S001
```

## 为什么需要 next-action

`next-action` 不是 AI 推理，也不会执行命令。它只读取 `state.json` 和当前 run 目录里的产物，按固定规则告诉用户下一步该做什么。

## next-action 规则

- `DRAFT`：建议 `approve`。
- `APPROVED` / `FIX_APPROVED`：建议 `export-task` 和 `make-execute-prompt`。
- `EXPORTED` / `FIX_EXPORTED`：如果缺 `execution-request.md`，建议生成；否则提示交给 Codex/Cursor 执行并导入候选输出。
- 有 `execution-result.json` 但缺 `tests.json`：建议 `verify`。
- 有 `tests.json` 但缺 `git.json`：建议 `git-check`。
- 有 `tests.json` 和 `git.json` 但缺 `web-review-request.md`：建议 `make-review-prompt`。
- 有 `web-review-request.md` 但缺 `review.json`：建议导入网页审查候选输出。
- Review verdict 为 `approved`：建议 `checkpoint`。
- Review verdict 为 `changes_required`：建议 `create-fix`，再批准、导出并生成执行提示词。
- Review verdict 为 `replan_required`：建议 `create-replan`。
- Checkpoint 为 `ready`：提示人工 `git add`、`git status --short`、`git commit`。
- Checkpoint 为 `blocked`：展示 blocking reasons，并建议先补齐证据。

## 验收命令

```bash
npm run build
npm run dev -- --help
npm run dev -- import-candidate examples/execution-result.candidate.md
npm run dev -- import-candidate examples/review-result.candidate.md
npm run dev -- next-action S001
npm run dev -- import-candidate examples/invalid-candidate.md
```

完整回归链路仍使用项目 README 中的 Step12 验收命令。

## 当前没有实现

- 尚未自动调用 Codex CLI。
- 尚未自动调用 AgentChat。
- 尚未自动调用网页 AI。
- 尚未自动修复严重损坏的 JSON。
- 尚未自动 commit。
- 尚未自动 push。

## 下一步建议

- 如果手动链路顺畅，进入 Codex CLI Executor 最小接入。
- 如果 review candidate 格式不稳定，先增强 candidate repair。
