# Step14：Codex Executor Safe Pilot

Step14 的目标不是完成自动化闭环，而是让真实 Codex executor 的第一次接入更安全、更可验证。AgentFlow 现在可以检查 Codex executor 配置，也可以在人工显式确认后启动本地 Codex CLI，并完整记录本次运行。

## 为什么需要安全试运行

真实外部命令可能是交互式的，可能不接受 stdin，可能参数格式与预期不同，也可能长时间运行、修改预期外文件、触发 Git lock，或产生很长的 stdout/stderr。因此 Codex executor 必须先经过 no-op 或小范围任务试运行，并保留清楚的失败记录。

## 检查配置

```bash
npm run dev -- check-executor codex
```

该命令会读取 `.agent/config.yaml`，检查 Codex executor 的 command、args、timeoutMs 和 maxOutputChars，并尝试解析 command 是否能被系统找到。它不会执行任务，也不会启动 Codex。

没有配置时使用默认值：

```yaml
executors:
  codex:
    command: "codex"
    args: []
    timeoutMs: 600000
    maxOutputChars: 50000
```

`args` 支持 YAML 多行数组和行内数组两种写法，可参考：

```text
examples/executor-config.multiline-args.yaml
examples/executor-config.inline-args.yaml
```

Windows 中文环境下推荐使用 stable mode：通过 `cmd.exe` 启动 `codex.cmd`，并启用 `promptMode: "file-reference"`。这样 AgentFlow 只通过 stdin 发送英文 wrapper prompt，完整中文 `execution-request.md` 由 Codex 按 UTF-8 从磁盘读取：

```yaml
executors:
  codex:
    command: "cmd.exe"
    args:
      - "/d"
      - "/s"
      - "/c"
      - "\"D:\\nodejs\\codex.cmd\" exec --sandbox read-only --color never -"
    timeoutMs: 60000
    maxOutputChars: 50000
    promptMode: "file-reference"
```

如果你的环境必须拆分参数，可以先人工验证；AgentFlow 推荐把 `.cmd` 调用作为 `/c` 后的一整条命令传给 `cmd.exe`，避免 Node 直接 spawn `.cmd` 触发 `spawn EINVAL`。

```yaml
executors:
  codex:
    command: "cmd.exe"
    args:
      - "/d"
      - "/s"
      - "/c"
      - "\"D:\\nodejs\\codex.cmd\" exec --sandbox read-only --color never -"
    timeoutMs: 60000
    maxOutputChars: 50000
    promptMode: "file-reference"
```

不推荐把 Codex executor 配成 `powershell.exe -File D:\\nodejs\\codex.ps1`。PowerShell wrapper 在 Windows 中文环境下容易造成 UTF-8 prompt 或中文文件内容乱码。如果输出中出现 `????` 或 `æ›´æ–°`，请优先检查 executor command 是否仍在使用 `codex.ps1`，是否直接 spawn `.cmd`，以及是否启用了 `promptMode: "file-reference"`。

Windows 下也可以用下面的命令人工确认：

```powershell
where codex
```

## 为什么需要 --confirm

`codex` executor 会启动外部进程，所以必须显式确认：

```bash
npm run dev -- run-executor S001 --executor codex --confirm
```

如果没有 `--confirm`：

```bash
npm run dev -- run-executor S001 --executor codex
```

AgentFlow 会拒绝启动 Codex CLI，并提示需要确认。未确认时不会写 `executor-run.json`，避免误解为执行过。

`dry-run` 和 `manual` executor 不需要 `--confirm`：

```bash
npm run dev -- run-executor S001 --executor dry-run
npm run dev -- run-executor S001 --executor manual
```

## 当前输入方式

Codex executor 支持两种 promptMode。

`stdin` 是兼容旧模式，会把完整 `execution-request.md` 写入 stdin，相当于：

```text
codex < execution-request.md
```

`file-reference` 是 Windows 推荐模式，只把英文 wrapper prompt 写入 stdin。wrapper 会要求 Codex 自己用 UTF-8 读取当前 run 的 `execution-request.md`。这种方式避免完整中文 prompt 经过 Windows stdin 管道。

`execution-request.md` 中已经包含 Windows 编码规则：如果需要在 Windows 上读取文本文件，使用：

```powershell
Get-Content -Raw -Encoding UTF8 <path>
```

不要使用普通的 `Get-Content -Raw <path>` 读取中文 UTF-8 文件，否则 Windows PowerShell 可能错误解码。

如果你的 Codex CLI 实际参数不是 stdin 模式，请在 `.agent/config.yaml` 中调整 command / args。后续会根据本地 Codex CLI 的真实行为继续适配；本 Step 不做复杂的多参数兼容设计。

## 查看运行记录

确认运行后会生成：

```text
.agent/steps/<stepId>/runs/<runId>/executor-run.json
.agent/steps/<stepId>/runs/<runId>/executor-output.md
```

`executor-run.json` 会记录：

```json
{
  "executor": "codex",
  "status": "completed",
  "exitCode": 0,
  "confirmed": true,
  "timedOut": false,
  "truncated": false,
  "command": "codex",
  "args": [],
  "timeoutMs": 600000
}
```

失败时也会记录 `status: failed` 和 `errorMessage`。超时会 kill 进程，并记录 `timedOut: true`。输出过长时会写入 `[Output truncated by AgentFlow]`，并记录 `truncated: true`。

`executor-output.md` 包含：

```md
# Executor Output

## Executor

- Name: codex
- Status: completed / failed
- Exit Code: ...

## Stdout

...

## Stderr

...

## Notes

- This output has not been trusted as final state.
- Run import-candidate only if it contains a valid ExecutionResult JSON.
```

## Fallback 到 manual executor

如果 Codex CLI 不存在、不兼容 stdin、超时或输出不可用，建议改用 manual executor：

```bash
npm run dev -- run-executor S001 --executor manual
```

然后把生成的执行提示词复制给你实际使用的执行器，拿到结果后再运行：

```bash
npm run dev -- import-candidate <executor-output.md>
```

## 验收命令

自动验收不要求真实启动 Codex executor：

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
npm run dev -- check-executor codex
npm run dev -- run-executor S001 --executor codex
npm run dev -- run-executor S001 --executor dry-run
npm run dev -- run-executor S001 --executor manual
npm run dev -- next-action S001
npm run dev -- status
```

`run-executor S001 --executor codex` 不带 `--confirm` 时应拒绝启动。

可选人工试运行：

```bash
npm run dev -- run-executor S001 --executor codex --confirm
```

只有确认要真实启动本地 Codex CLI 时才运行这条命令。建议先在 no-op Step 中试运行，再决定是否把 Codex executor 用于真实开发任务。

## 当前没有实现的内容

- 尚未完整适配所有 Codex CLI 参数。
- 尚未自动 import-candidate。
- 尚未自动 verify / git-check / review。
- 尚未自动 commit / push。
- 尚未实现 `agentflow run S001` 的半自动闭环。

## 下一步建议

- 在 no-op Step 中真实运行 codex executor，观察 stdin、超时、stdout/stderr 和文件修改行为。
- 再决定是否做 `agentflow run S001` 半自动闭环。
