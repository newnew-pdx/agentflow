# Codex Executor Windows 调用与编码问题排查记录

## 1. 背景

AgentFlow 在 Step14 之后已经具备 Executor Gateway，可以通过 `run-executor` 调用本地 Codex CLI，并记录 `executor-run.json` 与 `executor-output.md`。但在 Windows 下，Codex executor 的启动方式和中文 UTF-8 编码链路暴露出多个问题。

这不是 AgentFlow 核心状态机问题，也不是 Codex CLI 未安装。问题集中在 Windows 下 Node / PowerShell / cmd / codex wrapper 的调用链路，以及中文 UTF-8 内容经过 stdin、PowerShell 管道和文件读取时的处理差异。

本记录针对 S009 read-only smoke test：

```text
S009/R001
Goal: Codex executor smoke test：不要修改任何文件，只读取 package.json，并输出 ExecutionResult JSON
```

目标是保证下面的链路稳定可用：

```powershell
npm run dev -- run-executor S009 --executor codex --confirm
```

## 2. 问题现象

### 2.1 Node 找不到 codex

在 PowerShell 中可以找到 Codex CLI：

```powershell
Get-Command codex
codex --version
```

版本为：

```text
codex-cli 0.143.0
```

但是 AgentFlow 一开始使用下面配置时，Node 侧可能找不到命令：

```yaml
command: codex
```

原因是 Windows 下 PowerShell 能解析 `codex.ps1` 等 wrapper，但 Node `spawn` 不一定按 PowerShell 的命令解析规则寻找和执行 wrapper。

### 2.2 powershell.exe -File codex.ps1 能启动，但中文乱码

曾经使用过以下配置：

```yaml
executors:
  codex:
    command: "powershell.exe"
    args:
      - "-NoProfile"
      - "-ExecutionPolicy"
      - "Bypass"
      - "-File"
      - "D:\\nodejs\\codex.ps1"
      - "exec"
      - "--sandbox"
      - "read-only"
      - "--color"
      - "never"
    timeoutMs: 60000
    maxOutputChars: 20000
```

这个方式能启动 Codex，但完整中文 `execution-request.md` 经过 stdin / PowerShell wrapper 后会出现乱码，例如：

```text
????????
æ›´æ–°
锟斤拷
```

也出现过 PowerShell 把 Markdown 当脚本执行，产生大量 `CommandNotFoundException` 的情况。

### 2.3 PowerShell 管道传中文给 native command 不可靠

手动测试：

```powershell
"只回复：中文正常" | D:\nodejs\codex.cmd exec --sandbox read-only --color never -
```

Codex 收到的中文可能会变成：

```text
????????
```

结论：Windows PowerShell 5.1 管道传中文给 native command 不可靠。

### 2.4 Node 直接 spawn codex.cmd 会 spawn EINVAL

手动测试：

```powershell
node -e "const {spawn}=require('node:child_process'); const p=spawn('D:\\nodejs\\codex.cmd',['exec','--sandbox','read-only','--color','never','-'],{stdio:['pipe','inherit','inherit']}); p.stdin.write('只回复：中文正常','utf8'); p.stdin.end();"
```

结果：

```text
Error: spawn EINVAL
```

结论：Windows 下不要直接从 Node spawn `.cmd` 文件，应该通过 `cmd.exe /c` 包裹。

### 2.5 cmd.exe /c 的引号规则也有坑

曾经配置为：

```yaml
args:
  - "/d"
  - "/s"
  - "/c"
  - "\"D:\\nodejs\\codex.cmd\" exec --sandbox read-only --color never -"
```

AgentFlow 实际执行类似：

```text
cmd.exe /d /s /c "D:\nodejs\codex.cmd" exec --sandbox read-only --color never -
```

失败表现是：

```text
'"D:\nodejs\codex.cmd"' 不是内部或外部命令，也不是可运行的程序或批处理文件
```

原因是 `cmd.exe /c` 的 quote 解析比较特殊。在当前机器路径 `D:\nodejs\codex.cmd` 不含空格的情况下，去掉 path 外层引号更稳定。

## 3. 排查过程

1. 确认 Codex CLI 已安装：
   - `Get-Command codex`
   - `codex --version`
   - `codex exec` 可用

2. 确认 AgentFlow 的 `.agent/config.yaml` 多行 `args` 解析曾经有问题：
   - 一开始 args 没读对，导致启动了裸 `powershell.exe`。
   - Markdown 被当成 PowerShell 脚本执行。
   - 后来修复了 YAML args 数组解析。

3. 确认 `powershell.exe -File D:\nodejs\codex.ps1` 能启动，但会带来 UTF-8 中文乱码风险。

4. 确认 PowerShell 管道传中文到 native command 不可靠。

5. 确认 Node 直接 spawn `.cmd` 会出现 `spawn EINVAL`。

6. 改为 `cmd.exe /d /s /c ...codex.cmd exec ... -`。

7. 新增并使用 `promptMode=file-reference`：
   - 不再把完整中文 `execution-request.md` 通过 stdin 发给 Codex。
   - stdin 只发送英文 wrapper prompt。
   - wrapper 里要求 Codex 自己从磁盘读取 UTF-8 文件。

8. 在 `execution-request.md` 中加入 Windows UTF-8 读取规则：

```powershell
Get-Content -Raw -Encoding UTF8 <path>
```

9. 最终发现 `cmd.exe /c` 中 codex.cmd path 的外层引号会导致命令无法识别，于是把 config 改为不带 path 外层引号的形式。

## 4. 最终配置

当前可用配置：

```yaml
executors:
  codex:
    command: "cmd.exe"
    args:
      - "/d"
      - "/s"
      - "/c"
      - "D:\\nodejs\\codex.cmd exec --sandbox read-only --color never -"
    timeoutMs: 60000
    maxOutputChars: 50000
    promptMode: "file-reference"
```

说明：

- `cmd.exe` 用于避免 Node 直接 spawn `.cmd` 的 `spawn EINVAL`。
- `promptMode=file-reference` 用于避免中文 `execution-request.md` 通过 stdin 传输。
- 最后的 `-` 表示 Codex 从 stdin 读取英文 wrapper。
- 由于当前路径没有空格，所以不对 `D:\nodejs\codex.cmd` 单独加引号。
- 如果未来 Codex 安装路径包含空格，需要重新验证 `cmd.exe /c` 的 quoting 规则，不能直接照搬。

## 5. file-reference 模式说明

`file-reference` 模式的核心逻辑：

```text
stdin 只发送英文 wrapper prompt；
wrapper prompt 指向 execution-request.md 的相对路径；
Codex 自己用 UTF-8 从磁盘读取 execution-request.md；
中文内容不再走 Windows stdin 管道。
```

示例 wrapper：

```text
You are running as the AgentFlow Codex executor.

Read the full execution request from this UTF-8 file:

.agent/steps/S009/runs/R001/execution-request.md

On Windows PowerShell, read it with:
Get-Content -Raw -Encoding UTF8 ".agent/steps/S009/runs/R001/execution-request.md"

Then follow the instructions in that file exactly.

Important:
- Do not commit.
- Do not push.
- Do not modify files if the task says no-op.
- Preserve AgentFlow protocol boundaries.
- At the end, output ExecutionResult JSON only, or include a clearly fenced JSON block containing the ExecutionResult.
```

## 6. 最终验证结果

最终验证命令：

```powershell
npm run build
npm run dev -- check-executor codex
npm run dev -- make-execute-prompt S009
npm run dev -- run-executor S009 --executor codex --confirm
```

最终结果：

```text
npm run build 通过
check-executor codex 显示 command=cmd.exe
check-executor codex 显示 promptMode=file-reference
make-execute-prompt S009 生成 execution-request.md
execution-request.md 包含 Windows Encoding Rule
run-executor S009 --executor codex --confirm completed
executor-run.json 显示 exitCode=0
executor-run.json 显示 timedOut=false
executor-run.json 显示 promptMode=file-reference
executor-output.md 显示 Codex 正常读取 UTF-8 execution-request.md
filesChanged=[]
```

S009 的 ExecutionResult 摘要：

```json
{
  "protocolVersion": "agentflow.v1",
  "stepId": "S009",
  "runId": "R001",
  "status": "completed",
  "summary": "Smoke test completed. Required context files were read, package.json was read, and no files were modified.",
  "filesChanged": [],
  "suggestedNextAction": "review"
}
```

`npm run build` 在 S009 内部被 Codex 跳过是可接受的，因为 S009 是 read-only smoke test，目标是验证 executor 启动与编码链路，不是验证 build。用户已经在外部手动运行过 `npm run build` 并通过。

## 7. 结论

Windows 下 Codex executor 的稳定模式是：

```text
cmd.exe /d /s /c D:\nodejs\codex.cmd exec --sandbox read-only --color never -
+
promptMode=file-reference
+
Get-Content -Raw -Encoding UTF8 读取中文文件
```

当前 S009 验证已经证明：

- 不再出现 `spawn EINVAL`。
- 不再出现 PowerShell 把 Markdown 当脚本执行。
- 不再通过 stdin 传输完整中文 Markdown。
- 不再出现明显中文乱码。
- Codex 能读取 `execution-request.md`。
- Codex 能输出 ExecutionResult JSON。
- S009 没有修改文件。

## 8. 后续注意事项

- 暂时不要进入 Step15 前继续扩大自动化。
- 下一步如果要做 Step15，应先设计一个极小的 workspace-write smoke test。
- 不要让 Codex 自动 commit / push。
- 不要把 Codex stdout 直接视为最终状态，仍然需要 `import-candidate`、`verify`、`git-check`、review、checkpoint。
- 如果未来更换 Codex 安装路径、Node 版本、PowerShell 版本或 Windows Terminal 编码设置，需要重新跑 S009 smoke test。
