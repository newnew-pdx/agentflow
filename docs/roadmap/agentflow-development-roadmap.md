# AgentFlow Development Roadmap

Status: Active  
Current implemented baseline: Step0–Step15  
Current roadmap entry point: Step16  
Primary goal: Personal development workflow tool  
Secondary goal: Demonstrable engineering project  
Last updated: 2026-07-16

> AgentFlow 后续不会追求短期完成，也不会因为暂停数周而视为放弃。项目采用周末小步推进，每次只处理一个范围明确、能够验证的改动。

本文保存 Step15 之后的长期方向、Step 边界、阶段门和人工审批点。它不是当前 Step 的执行计划；某个 Step 即将开始时，仍需单独讨论范围并建立可验证的 spec。

## 项目目标与非目标

### Primary Goal

将 AgentFlow 做成用户自己能够长期使用的本地 AI Coding 工作流工具，把规划、审批、执行、验证、审查、修复或重规划、Checkpoint 和恢复连接成透明、可检查的本地流程。

### Secondary Goal

将 AgentFlow 做成一个能够展示以下工程能力的项目：

- TypeScript / Node.js CLI；
- Schema 和协议设计；
- 状态机；
- 审批和安全边界；
- Codex CLI 集成；
- Git 和测试证据；
- Windows 编码与子进程兼容；
- Web Provider Adapter；
- 可恢复、可审计的 AI Coding 工作流。

### Non-goals for the current roadmap

当前阶段不追求：

- SaaS；
- 多用户系统；
- GUI；
- 大规模多 Agent 并发；
- 大量 Web Provider；
- 自动 commit、push 或 merge；
- 无限自动修复；
- 完整 Event Sourcing；
- 为功能数量而增加功能。

## 已完成基线

Step0～Step15 已形成一条可人工控制的纵向能力链。这里的“已形成”表示相应代码、命令或试运行产物已经存在，不表示所有能力已在当前 `main` 上重新验收。

- TypeScript / Node.js CLI 骨架，以及 `init`、`status`、`plan` 等基础命令；
- `TaskPacket`、`ExecutionResult`、`ReviewResult` 及 Zod/Schema 校验；
- `.agent/` 本地记忆目录、项目资料和 Context Pack；
- plan、approve、export、ExecutionResult import；
- `verify`、`git-check` 及测试和 Git 证据产物；
- ReviewResult 导入、展示和 verdict 状态摘要；
- Fix Run、Replan Request 和同一 Step 多 Run；
- Checkpoint 摘要和人工 commit message 建议；
- Web Plan / Review Prompt 生成与 Web Plan 导入；
- Manual Execute Prompt；
- Candidate Import 和 `next-action`；
- DryRun、Manual、Codex Executor Gateway；
- Codex CLI Safe Pilot、超时、输出截断和失败记录；
- Windows 下 `cmd.exe + file-reference` 的 Codex 调用方案；
- `read-only` / `workspace-write` sandbox override；
- S010 workspace-write 试运行闭环；
- Step15 已提交并推送到 `githubstep14`。

相关历史说明以 [现有路线图](../roadmap.md)、[Web AI Gateway 设计](../design/web-ai-gateway.md) 和 [Step 文档](../steps/) 为索引。

### Step16 verification outcome

Step16 has now confirmed the items above with formal commands and recorded evidence: Step15 is contained in local `main`, the remote `main` baseline was confirmed before finalization, the final main worktree is clean, and build, typecheck, CLI help, and `check-executor codex` passed in a normal PowerShell terminal. The detailed immutable verification record appears in the Step16 section below.

## 开发原则

1. 每次只推进一个 Step；
2. 一个 Step 可以跨越多个周末；
3. 每次修改必须有命令、测试或文件证据；
4. 先保证可靠性，再增加自动化；
5. 先完成 Codex 本地链路，再正式接入 Web Provider；
6. AI 输出始终是候选内容；
7. AgentFlow 的确定性代码负责 Schema、Policy、State 和 Evidence；
8. commit、push、merge 始终由人工决定；
9. 项目允许长期暂停，但暂停前要留下可恢复状态；
10. 不以 Step 数量或完成速度衡量进度。

# 阶段一：建立可靠基线

## Step16：稳定主分支基线

**Status:** Completed

### Verification record (2026-07-17)

- Verified baseline commit: `72deab52a1d33b01f8539abd623e0fcbcc746814`.
- Repository relation: local `main` and `origin/main` both resolve to the verified baseline; ahead/behind is `0/0` after `git fetch origin --prune`.
- Verification worktree: `codex/step16-baseline`, intentionally based on the same baseline commit so that the primary `main` worktree remains untouched and aligned with its remote.
- Working-tree classification: the only pre-existing difference was `docs/roadmap/agentflow-development-roadmap.md`, an approved user roadmap copy. It was synchronized into the Codex worktree before this record and is the only Step16 documentation change.
- Environment: Windows 10 (PowerShell 5.1), Node.js `v24.14.1`, npm `11.11.0`, Codex CLI `0.143.0`.
- `npm run build` (exit 0): passed.
- `npm run typecheck` (exit 0): passed.
- `npm run dev -- --help` (exit 0): passed.
- Initial Codex-worktree `npm run dev -- check-executor codex` (exit 0): passed. That worktree's configured `cmd.exe` wrapper resolved successfully, reported `read-only` sandbox mode, and used the file-reference prompt mode.
- Final main `npm run dev -- check-executor codex` (exit 0): passed in normal PowerShell. The main worktree resolved the direct `codex` command at `D:\nodejs\codex`; its ignored local executor configuration uses stdin prompt mode and has no configured sandbox override.
- Known limitation: the four checks were rerun in a normal terminal because the restricted runner prevented `tsx/esbuild` from spawning a child process (`spawn EPERM`); the normal-terminal results above are the authoritative verification evidence.

### Goal

建立 Step15 之后唯一可信、可复现的主分支起点，并确保 Context Pack 反映真实状态。

### Why this step exists

后续安全、状态机和自动化工作都依赖一个清晰基线。分支、远端、生成物或 Executor 状态不明确时，任何后续证据都可能混入旧变更。

### Dependencies

- Step0～Step15 代码和文档；
- 可访问本地 `main`、远端和普通用户终端；
- 已安装 Node.js、npm 和 Codex CLI。

### Scope

- 在 `main` 重跑 build、typecheck 和 CLI help；
- 在普通终端运行 `check-executor codex`；
- 确认本地与远端 `main`；
- 解释工作区状态；
- 刷新 Context Pack 和 current-state；
- 记录基线 commit、Node 版本、Codex 版本和验证结果。

### Out of scope

- 修复验证过程中发现的功能问题；
- 建立测试框架；
- 修改 Executor 行为；
- 开始 Step17 或其他后续 Step。

### Acceptance criteria

- `main` 与远端一致；
- 工作区干净，或者所有脏变更有明确解释；
- build 和 typecheck 通过；
- CLI help 可运行；
- Codex CLI 可被发现；
- Context Pack 反映当前真实状态；
- 留下可引用的基线验证记录。

### Main risks

- 本地 remote-tracking ref 过期；
- 受限执行环境与普通终端行为不同；
- 刷新 Context 时生成文件造成新的脏状态；
- 把发现的问题顺手扩展为修复任务。

### Human gates

- 人工确认分支、远端和工作区解释；
- 是否修复发现的问题必须另开 Step；
- commit、push、merge 不由本 Step 自动执行。

### Discussion packet

```text
我们正在继续 AgentFlow 项目，目前准备讨论 Step16：稳定主分支基线。

当前已知基线：
- Step0～Step16 已形成纵向能力链；main、origin/main 和主分支复验已在 Step16 中确认，正式验证记录起始于 `3a4057b`。

本 Step 目标：
- 确认 main/远端/工作区，重跑 build、typecheck、CLI help 和 check-executor，并刷新 Context Pack。

本 Step 暂不包含：
- 修复发现的问题、建立测试框架或实现后续功能。

完成标准：
- 得到干净或可解释、命令复验通过且可恢复的稳定基线记录。

请先帮助我审查该 Step 的范围、风险和验收标准，不要立即扩大到后续 Step，也不要一次给出大量执行操作。
```

## Step17：自动化测试骨架

**Status:** Completed

### Execution record (2026-07-17)

- Test entry: `npm test` runs `npm run build --silent && tsx --test test/*.test.ts`.
- Test architecture: `test/helpers/fixtures.ts` creates unique system-temporary project directories with isolated `.agent`, `HOME`, `USERPROFILE`, `TMP`, and `TEMP` paths; it always removes them in `finally`, with bounded Windows retry handling. The Git fixture initializes a repository, sets only repository-local identity, and creates an initial commit. `test/helpers/cli.ts` invokes the compiled `dist/index.js` through `process.execPath` with explicit argument arrays, cwd, environment, captured output, exit code, spawn errors, and timeout handling.
- Minimal tests: compiled CLI help succeeds; temporary Git identity and initial commit work; temporary-directory cleanup survives a throwing callback; `init` writes only under an explicit temporary cwd; callers can use the Git fixture with `try/finally` cleanup.
- Isolation: test subprocesses use only temporary cwd paths and the test fixtures override user and temporary-directory environment roots without clearing the rest of the Node/Git environment. No test invokes Codex, Web, or a network API.
- Verification: `npm run build`, `npm run typecheck`, `npm run dev -- --help`, and two consecutive `npm test` runs all exited `0` in Windows PowerShell. The real repository worktree, ignored `.agent`, repository lock state, and global Git identity presence were checked before and after; no test-created change was found.
- Known limitation: this Step establishes the test harness only; it intentionally does not provide historical full-command coverage, Codex execution tests, Web tests, or CI.
- Step17 implementation commit: `8987c07bc9a67ac6839e1753ccdfe11938704181` (`step17: add isolated test skeleton`).
- Remote branch: `origin/codex/step17-test-skeleton` was published successfully at `668fe42d973c6664e689e79299a58d80d60b900a`. Step17 implementation, verification, and publication to its independent working branch are complete; it has not been merged into `main`.
- Step18 has not been started.

### Goal

建立可重复、隔离真实项目数据、能被后续 Step 持续扩展的自动化测试入口。

### Why this step exists

状态、安全、解析和恢复重构如果没有回归测试，会使已跑通的纵向链路随时退化。测试骨架必须先于核心加固。

### Dependencies

- Step16 稳定基线；
- 当前 TypeScript 构建和 CLI 入口可运行。

### Scope

- 增加 `npm test`；
- 使用临时项目目录、临时 `.agent` 目录和临时 Git 仓库；
- 建立 CLI 测试 helper；
- 覆盖 Schema、状态读写、路径安全和基础 happy path；
- 为时间、ID、project root、command runner 等不稳定依赖预留注入点。

### Out of scope

- 一次性覆盖所有历史命令；
- 状态机重构；
- Web 或 Codex 真实进程测试；
- 追求覆盖率数字本身。

### Acceptance criteria

- `npm test` 可重复运行；
- 测试不依赖真实 `.agent/` 数据；
- 测试失败不会污染真实仓库；
- 测试支持临时 Git 仓库；
- 后续 Step 可按统一模式增加测试。

### Main risks

- 为了测试而过度重构生产代码；
- 测试依赖本机时间、路径或 Git 配置；
- CLI 子进程测试在 Windows 上不稳定。

### Human gates

- 人工选择最小测试工具和依赖；
- 大规模可测试性重构必须拆成独立 Step；
- 不因测试骨架自动推进 Step18。

### Discussion packet

```text
我们正在继续 AgentFlow 项目，目前准备讨论 Step17：自动化测试骨架。

当前已知基线：
- Step16 应已建立稳定 main；当前项目缺少正式 npm test 和隔离 fixture。

本 Step 目标：
- 建立临时目录、临时 Git 仓库、CLI helper 和最小回归测试入口。

本 Step 暂不包含：
- 全量历史覆盖、状态机重构、真实 Codex 或 Web 调用。

完成标准：
- npm test 可重复运行且不污染真实 .agent 或工作区。

请先帮助我审查该 Step 的范围、风险和验收标准，不要立即扩大到后续 Step，也不要一次给出大量执行操作。
```

## Step18：AgentChat 兼容性 Spike

**Status:** Planned

### Goal

用可丢弃实验验证 AgentChat 在当前 Windows 环境中的基本可用性，不形成正式 Provider 契约。

### Why this step exists

正式设计 WebProvider 之前，应尽早验证 Chrome Debug Profile、登录态、CLI 参数、中文 Prompt、stdout/stderr 和回执的真实行为，避免在未知外部依赖上建设内核。

### Dependencies

- Step17 最小测试和记录能力；
- AgentChat 独立目录；
- 独立持久化 Chrome Debug Profile；
- 至少一个已登录网页 Provider。

### Scope

- 验证 Windows 启动或连接方式；
- 运行 `--doctor` 和 `--smoke`；
- 只发送固定、合成且不含项目代码的 Prompt；
- 捕获 stdout、stderr、exitCode、耗时和 receipt；
- 区分模型正文、诊断和 receipt；
- 保存原始输出和失败原因；
- Spike 可位于 `scripts/spikes/` 或 experimental 命令。

### Out of scope

- 正式 WebProvider API；
- 发送真实源码、完整 Diff 或 Context Pack；
- 解析、导入或推进 Step 状态；
- 复制或修改 AgentChat 的 Playwright、CDP、selector 代码；
- 复用用户日常 Chrome 默认 Profile。

### Acceptance criteria

- Windows 上可启动或连接独立 Debug Profile；
- 至少一个网页 AI 可用；
- 能区分正文、诊断和 receipt；
- 失败不修改 AgentFlow 状态；
- 形成 Go / No-Go 兼容性记录；
- **Needs verification:** 当前 AgentChat 入口的 receipt 格式和稳定性已被实测确认。

### Main risks

- 网页 DOM、登录态和网络条件导致不稳定；
- Spike 代码被错误当成正式 API；
- stderr 混合诊断和结构化回执；
- 用户默认 Chrome Profile 被实验污染。

### Human gates

- 人工完成网页登录并确认使用独立 Profile；
- 任何真实项目内容不得在本 Step 外发；
- Spike 是否保留由人工在验收后决定。

### Discussion packet

```text
我们正在继续 AgentFlow 项目，目前准备讨论 Step18：AgentChat 兼容性 Spike。

当前已知基线：
- AgentFlow 尚未正式接入 Web Provider；本 Step 只验证 Windows、Chrome CDP 和 AgentChat CLI 行为。

本 Step 目标：
- 用合成 Prompt 验证 doctor、smoke、正文、诊断、exitCode、超时和 receipt。

本 Step 暂不包含：
- 正式 Provider API、真实项目数据外发、解析导入或状态推进。

完成标准：
- 得到可复现的兼容性结论，失败不影响 AgentFlow 状态或用户默认 Chrome Profile。

请先帮助我审查该 Step 的范围、风险和验收标准，不要立即扩大到后续 Step，也不要一次给出大量执行操作。
```

# 阶段二：加固输入、安全和状态

## Step19：统一输入与 Candidate Extractor

**Status:** Planned

### Goal

让来自文件、Codex 和未来 Web Provider 的候选输出能够被确定性读取、匹配和导入。

### Why this step exists

当前多 JSON、UTF-8 BOM、模板对象和旧 Run 输出可能造成误导入。自动续流之前必须先消除候选选择的不确定性。

### Dependencies

- Step17 测试骨架；
- 当前协议 Schema 和 Candidate Import 实现。

### Scope

- JSON 读取统一 strip BOM；
- 扫描全部 JSON 候选；
- 对每个候选执行 Schema 校验；
- 按协议类型、stepId、runId 匹配；
- 模板 JSON 降权或排除；
- 同等有效候选拒绝自动导入；
- 旧 Run 输出不能覆盖当前 Run；
- 增加中文、BOM、多候选和错误 Run 回归测试。

### Out of scope

- 修复任意损坏 JSON；
- 使用 LLM 决定正确候选；
- Web Provider 调用；
- 状态机全面重构。

### Acceptance criteria

- 多 JSON 输出可确定性导入；
- 歧义会暂停并给出候选说明；
- 错误 Step 或旧 Run 不会被误更新；
- 中文和 UTF-8 BOM 回归测试通过；
- 所有输入入口复用统一读取策略。

### Main risks

- 启发式评分继续产生静默误选；
- 兼容旧格式时放宽 Schema；
- 路径或编码修复分散在多个命令中。

### Human gates

- 多个合法候选必须人工选择或重新生成；
- 不允许自动修补语义不完整结果；
- 旧协议兼容范围由人工确认。

### Discussion packet

```text
我们正在继续 AgentFlow 项目，目前准备讨论 Step19：统一输入与 Candidate Extractor。

当前已知基线：
- Candidate Import 已存在，但多 JSON、BOM、模板候选和旧 Run 仍可能造成误导入。

本 Step 目标：
- 统一读取并按 Schema、协议类型、stepId/runId 确定性选择候选。

本 Step 暂不包含：
- LLM 修复 JSON、Web 调用或完整状态机重构。

完成标准：
- 唯一候选可导入，歧义和错误 Run 必须暂停且有测试。

请先帮助我审查该 Step 的范围、风险和验收标准，不要立即扩大到后续 Step，也不要一次给出大量执行操作。
```

## Step20：验收命令安全策略

**Status:** Planned

### Goal

把 Web 或 AI 生成的任意 Shell 字符串替换为本地可审计的验收意图和命令策略。

### Why this step exists

当前 `acceptanceCommands` 可直接进入 Shell。真实项目和未来 Web Planner 接入前，必须阻断命令注入并限制执行边界。

### Dependencies

- Step17 测试骨架；
- Step19 统一输入；
- 现有 TaskPacket 和 verifier。

### Scope

- 增加 `acceptanceChecks` 或等价验收意图；
- 支持 `node.build`、`node.test`、`maven.test` 等最小 profile；
- 本地白名单映射为 command + args；
- 优先使用 `spawn(command, args, shell=false)`；
- 限制 cwd、timeout 和输出长度；
- 任意自由 Shell 命令单独批准并保存 hash；
- 设计旧 `acceptanceCommands` 的兼容和迁移策略；
- 记录每条命令的审计信息。

### Out of scope

- 通用 Shell 沙箱；
- 支持所有构建工具；
- 仅靠关键词黑名单保证安全；
- 自动安装依赖或下载工具。

### Acceptance criteria

- Web AI 不能直接注入任意 PowerShell；
- 常见 Node 和 Maven 验收可正常执行；
- 每条命令均有审计记录；
- cwd、timeout、输出上限被强制执行；
- 高风险命令不能只依赖关键词拦截；
- 兼容策略有测试和迁移说明。

### Main risks

- profile 过宽重新引入任意执行；
- 兼容旧字段时默认信任 Shell；
- Windows 命令和跨平台参数差异；
- 超时后子进程树未正确终止。

### Human gates

- 自由 Shell 模式必须逐次明确批准；
- 新增 profile 需要人工审查 command、args 和 cwd；
- 自动依赖安装不属于验收动作。

### Discussion packet

```text
我们正在继续 AgentFlow 项目，目前准备讨论 Step20：验收命令安全策略。

当前已知基线：
- verify 当前可执行 TaskPacket 中的 acceptanceCommands，存在任意 Shell 边界。

本 Step 目标：
- 用本地 acceptanceChecks/profile 映射可信 command+args，并强制 cwd、timeout 和审计。

本 Step 暂不包含：
- 通用 Shell 沙箱、所有构建工具或自动安装依赖。

完成标准：
- Web AI 不能注入任意 PowerShell，Node/Maven 常见验收可安全运行。

请先帮助我审查该 Step 的范围、风险和验收标准，不要立即扩大到后续 Step，也不要一次给出大量执行操作。
```

## Step21：统一状态机

**Status:** Planned

### Goal

让所有 CLI 命令通过同一状态迁移入口推进，阻止非法顺序和旧 Run 覆盖当前状态。

### Why this step exists

当前部分命令只 warning 后继续，且状态更新分散。Action Engine 和恢复机制需要一个可验证的确定性状态内核。

### Dependencies

- Step17 测试骨架；
- Step19 Candidate Run 匹配；
- 当前 StepState 和命令集合。

### Scope

- Step21-A：定义合法迁移表；
- Step21-B：增加统一 `transitionStep()` 并接入现有命令；
- Step21-C：实现安全操作幂等和最小事件记录；
- 非法迁移直接拒绝；
- 旧 Run 不能推进当前 Step；
- 状态变化记录时间、原因和触发动作。

### Out of scope

- 完整 Event Sourcing；
- Action Engine；
- 自动恢复高影响动作；
- 数据库迁移。

### Acceptance criteria

- DRAFT 不能直接执行；
- 未批准任务不能 export；
- 旧 Run 不能推进当前 Step；
- CLI 不能绕过状态机；
- 合法和非法迁移均有测试；
- 重复安全操作具有明确结果。

### Main risks

- 一次接入所有命令导致过大变更；
- 旧状态文件无法兼容；
- 幂等规则与副作用混淆；
- 状态名称继续膨胀。

### Human gates

- 迁移表在实现前人工审查；
- 不确定旧状态迁移必须暂停；
- Step21-A/B/C 可分别验收，不要求一个周末完成。

### Discussion packet

```text
我们正在继续 AgentFlow 项目，目前准备讨论 Step21：统一状态机。

当前已知基线：
- 状态字段已存在，但命令可分散更新，部分非法顺序只 warning 后继续。

本 Step 目标：
- 定义迁移表和 transitionStep()，让所有命令受统一状态约束。

本 Step 暂不包含：
- 完整 Event Sourcing、Action Engine、数据库或高影响动作自动恢复。

完成标准：
- 合法迁移可测试，非法迁移和旧 Run 推进被拒绝。

请先帮助我审查该 Step 的范围、风险和验收标准，不要立即扩大到后续 Step，也不要一次给出大量执行操作。
```

## Step22：任务审批不可变性

**Status:** Planned

### Goal

确保人工批准对应某个 Run 的确定 TaskPacket 内容，而不是只批准 Step 编号。

### Why this step exists

TaskPacket 在批准后仍可能被修改。后续 Codex、verify 和自动续流必须确认执行内容与人工批准内容完全一致。

### Dependencies

- Step21 统一状态机；
- canonical JSON 规则；
- 当前 approve、export、run-executor 和 verify。

### Scope

- 对 canonical TaskPacket 计算 hash；
- 保存 approvedAt、approvedHash 和对应 runId；
- export、Codex 执行和 verify 前复核；
- TaskPacket 修改后回到待批准状态；
- Fix Run 和 Replan 后重新批准；
- 增加字段顺序、换行和真实内容变化测试。

### Out of scope

- 数字签名或远程身份系统；
- 多用户审批；
- 自动批准低风险任务；
- Git commit 签名。

### Acceptance criteria

- 批准后修改 `task.json` 会被检测；
- 被修改任务不能继续 export、execute 或 verify；
- 审批精确对应某个 Run；
- 无语义格式差异不会产生不必要 hash 漂移；
- Fix/Replan 新内容必须重新批准。

### Main risks

- canonicalization 不稳定；
- hash 只覆盖部分字段；
- 兼容旧 Step 时误判为已批准；
- 审批状态和文件写入不是原子操作。

### Human gates

- 人工检查批准摘要和 hash；
- TaskPacket 变化后必须再次确认；
- 不引入自动审批。

### Discussion packet

```text
我们正在继续 AgentFlow 项目，目前准备讨论 Step22：任务审批不可变性。

当前已知基线：
- approve 已存在，但尚未证明批准后 task.json 不可静默修改。

本 Step 目标：
- 用 canonical TaskPacket hash 将批准绑定到确定的 stepId/runId/内容。

本 Step 暂不包含：
- 多用户、数字签名、自动审批或 Git commit 签名。

完成标准：
- 修改已批准任务会阻止 export、Codex 执行和 verify，并要求重新批准。

请先帮助我审查该 Step 的范围、风险和验收标准，不要立即扩大到后续 Step，也不要一次给出大量执行操作。
```

## Step23：Git Evidence 与 Checkpoint

**Status:** Planned

### Goal

准确区分执行前基线与当前 Step 增量，让 Reviewer 和人工提交只看到并暂存相关变更。

### Why this step exists

当前 Git diff 不包含 untracked 正文，混杂工作区可能被错误视为 ready，Checkpoint 还可能建议 `git add .`。

### Dependencies

- Step17 临时 Git 测试；
- Step21 状态机；
- 当前 git-check 和 checkpoint。

### Scope

- 记录执行开始前的 HEAD、branch、status、dirty patch/hash 和 untracked hash；
- 区分既有变更与当前 Step 增量；
- untracked 文本文件生成安全 synthetic diff；
- 二进制文件只记录摘要；
- Checkpoint 生成精确 `git add <files>`；
- 移除 `git add .` 建议；
- mixed baseline 区分 clean、mixed-approved 和 mixed-unapproved。

### Out of scope

- 自动 git add、commit、push 或 merge；
- 完整内容级 secret scanner；
- 自动清理用户既有变更；
- 重写 Git 历史。

### Acceptance criteria

- Reviewer 能看到新增文本文件内容；
- mixed baseline 不会无提示 ready；
- 未批准混杂基线会阻止 Checkpoint；
- Checkpoint 只建议暂存当前 Step 相关文件；
- 二进制和敏感文件不会把内容写入证据包；
- clean、mixed-approved、mixed-unapproved 均有测试。

### Main risks

- rename、删除、子模块和大文件边界；
- baseline hash 与实际工作区漂移；
- synthetic diff 泄露敏感内容；
- Windows Git path quoting。

### Human gates

- mixed baseline 必须人工确认其来源；
- 暂存和 commit 始终人工执行；
- 敏感文件命中时不允许自动降级为 warning。

### Discussion packet

```text
我们正在继续 AgentFlow 项目，目前准备讨论 Step23：Git Evidence 与 Checkpoint。

当前已知基线：
- untracked 正文可能缺失，混杂工作区识别不足，Checkpoint 仍可能建议 git add .。

本 Step 目标：
- 记录执行前基线，生成当前 Step 增量证据和精确暂存建议。

本 Step 暂不包含：
- 自动 add/commit/push、清理用户变更或完整 secret scanner。

完成标准：
- Reviewer 可见新增文本，mixed baseline 受控，Checkpoint 只建议相关文件。

请先帮助我审查该 Step 的范围、风险和验收标准，不要立即扩大到后续 Step，也不要一次给出大量执行操作。
```

# Gate A：Core Hardening Pilot

**Status:** Planned

Gate A 不是新功能 Step。Step23 完成后，使用一个小型真实 Java 任务运行人工闭环，验证 Candidate Extractor、命令策略、状态机、Task hash、Git baseline 和 Checkpoint 的组合行为。

至少覆盖：

- 一条成功到达 Checkpoint 的路径；
- 一条 `verify failed` 或 `changes_required → Fix Run` 路径；
- 干净 worktree 起点和明确的人工 commit 范围；
- Gate 中断后的人工恢复记录。

Gate A 通过标准：

- 所有核心加固能力在真实 Java 仓库中有效；
- 非法状态和未批准内容被阻止；
- Evidence 足以独立复核；
- Fix 分支可以完成；
- 没有依赖未实现的 Action Engine。

如果 Gate A 未通过，记录失败证据并回到对应 Step 修复；不进入 Step24。

# 阶段三：让 Codex 本地流程自动衔接

## Step24：工作流事件日志与保守恢复

**Status:** Planned

### Goal

记录 Action 尝试和结果，使流程中断后能够区分安全可重试、已完成和状态不确定的动作。

### Why this step exists

Action Engine 不能只依赖最终 state.json 推测外部进程是否已执行。尤其 Codex workspace-write 等高影响动作，在崩溃后不能静默重复。

### Dependencies

- Gate A 通过；
- Step21 状态机；
- Step22 Task hash；
- Step23 Git baseline。

### Scope

- 增加按 Step 或 Run 保存的 `workflow-events.jsonl`；
- 记录 action started、completed、failed、uncertain；
- 每个 action 有 attemptId；
- 保存输入摘要、输出路径、错误和恢复信息；
- 对开始但没有结束的高影响动作标记为 UNCERTAIN；
- 定义安全动作和高影响动作的恢复规则。

### Out of scope

- 完整 Event Sourcing；
- 从事件重建全部状态；
- 分布式事务；
- 自动重放 Codex 或 Web Provider 调用。

### Acceptance criteria

- 安全确定性动作能够恢复；
- 不确定高影响动作不会被静默重复；
- 系统能解释上次为什么停止；
- 不确定时暂停并要求人工选择；
- 部分写入和重复 attempt 有测试。

### Main risks

- state 和事件写入顺序不一致；
- 日志损坏或部分行；
- 把 Event Log 扩展成过重架构；
- attemptId 不能稳定关联产物。

### Human gates

- UNCERTAIN 高影响动作必须人工确认；
- 日志损坏时默认暂停；
- 不自动重新运行外部进程。

### Discussion packet

```text
我们正在继续 AgentFlow 项目，目前准备讨论 Step24：工作流事件日志与保守恢复。

当前已知基线：
- Gate A 应已验证加固内核；外部动作中断后仍需要可解释的恢复依据。

本 Step 目标：
- 用 attemptId 和 started/completed/failed/uncertain 事件记录动作结果与恢复信息。

本 Step 暂不包含：
- 完整 Event Sourcing、分布式事务或自动重放高影响动作。

完成标准：
- 安全动作可恢复，高影响不确定动作暂停且不会静默重复。

请先帮助我审查该 Step 的范围、风险和验收标准，不要立即扩大到后续 Step，也不要一次给出大量执行操作。
```

## Step25：结构化 Action Engine

**Status:** Planned

### Goal

把 `next-action` 从面向人工的命令字符串升级为可验证、可执行、可暂停的结构化 Action。

### Why this step exists

Codex 本地自动续流需要统一决定下一步、风险和人工门，但不能通过字符串拼接递归调用自身 CLI。

### Dependencies

- Step24 事件日志；
- Step21 状态机；
- 现有 `next-action` 判断规则。

### Scope

- 定义 Action kind、risk、stepId、runId、requiresConfirmation 和 pauseReason；
- `agentflow advance <stepId>` 只执行一个安全 Action；
- `agentflow flow <stepId>` 连续执行安全 Action，直到人工门；
- `agentflow resume <stepId>` 根据事件日志恢复；
- 设置最大 Action 次数和循环检测；
- 将现有 next-action 规则迁移为结构化决策；
- 保留可读的人类建议输出。

### Out of scope

- 自动确认 workspace-write；
- Web Provider；
- 自动 commit/push；
- 无限 Fix/Replan；
- 使用 `agentflow run` 造成 Run ID 语义混淆。

### Acceptance criteria

- advance 只执行一个安全 Action；
- flow 运行到人工门并停止；
- resume 根据事件日志恢复；
- 不通过命令字符串递归调用 CLI；
- 每次暂停有明确 pauseReason；
- 循环和最大 Action 数受到限制；
- Fake/Stub Action 有集成测试。

### Main risks

- Action 决策与状态机产生两套真相；
- “安全”分类过宽；
- 动作副作用和幂等性不清晰；
- 循环检测只依赖状态字符串。

### Human gates

- 高风险 Action 必须返回暂停而不是执行；
- 新 Action kind 需人工审查风险等级；
- commit、push、merge 永远不成为自动 Action。

### Discussion packet

```text
我们正在继续 AgentFlow 项目，目前准备讨论 Step25：结构化 Action Engine。

当前已知基线：
- next-action 已能建议命令，Step24 应已提供 attempt 和恢复事件。

本 Step 目标：
- 定义结构化 Action，并实现 advance、flow、resume 运行到人工门。

本 Step 暂不包含：
- Web Provider、自动 workspace-write 确认、自动 commit/push 或无限循环。

完成标准：
- 安全 Action 可执行和恢复，高风险动作暂停，所有暂停都有 pauseReason。

请先帮助我审查该 Step 的范围、风险和验收标准，不要立即扩大到后续 Step，也不要一次给出大量执行操作。
```

## Step26：Codex 执行后自动续流

**Status:** Planned

### Goal

在人工批准 TaskPacket 和人工确认 workspace-write 后，自动完成 Codex 输出到 Web Review Prompt 之间的本地确定性链路。

### Why this step exists

当前 Codex executor 只运行一次，后续 import、verify、git-check 和 review prompt 仍需人工逐条执行。

### Dependencies

- Step25 Action Engine；
- Step19 唯一 Candidate；
- Step20 命令策略；
- Step22 Task hash；
- Step23 Git baseline；
- Step24 恢复记录。

### Scope

- 人工批准 TaskPacket；
- 人工确认 workspace-write；
- 启动 Codex；
- 成功后提取唯一匹配的 ExecutionResult；
- 自动执行安全 verify；
- 自动执行 git-check；
- 自动生成 Web Review Prompt；
- 失败、歧义或测试失败时暂停；
- 设置时间、Action 和 Run 数限制。

### Out of scope

- 自动调用 Web Provider；
- 自动认可 Review verdict；
- 自动 commit/push；
- 自动确认 workspace-write；
- 无上限修复循环。

### Acceptance criteria

一次人工确认后可以完成：

```text
Codex
→ Import
→ Verify
→ Git Check
→ Review Prompt
```

并且：

- Candidate 歧义、验证失败和 Git 风险均正确暂停；
- 中断后 resume 不重复高影响动作；
- 产物和事件可追溯。

### Main risks

- Codex 输出成功但结果对象缺失；
- 外部进程结束状态与文件修改不一致；
- 验证失败后错误继续；
- workspace-write 进程中断后状态不确定。

### Human gates

- TaskPacket 批准；
- workspace-write 确认；
- UNCERTAIN 动作处理；
- Candidate 歧义和验证失败处理；
- commit、push、merge。

### Discussion packet

```text
我们正在继续 AgentFlow 项目，目前准备讨论 Step26：Codex 执行后自动续流。

当前已知基线：
- Action Engine 和恢复日志应已完成；Codex 目前仍只执行一次，后续步骤需要手工衔接。

本 Step 目标：
- 在批准和 workspace-write 确认后，自动完成 Codex→Import→Verify→Git Check→Review Prompt。

本 Step 暂不包含：
- Web Provider、自动 Review verdict、自动 commit/push 或无限修复。

完成标准：
- 本地链路可自动运行到 Review Prompt，失败和不确定状态会安全暂停并可恢复。

请先帮助我审查该 Step 的范围、风险和验收标准，不要立即扩大到后续 Step，也不要一次给出大量执行操作。
```

# Gate B：Local Automation Pilot

**Status:** Planned

Gate B 不是新功能 Step。Step26 完成后，在不接入 AgentChat 的情况下，使用真实 Java 小任务验证本地自动续流。

至少覆盖：

- Codex 到 Review Prompt 的成功路径；
- Candidate 歧义或 verify failed 的暂停路径；
- 进程中断后 resume；
- 重复 resume 不重复已完成动作；
- Fix Run 再次进入 Codex 本地自动链路。

Gate B 通过标准：

- 自动续流只跨越已分类为安全的 Action；
- 所有人工门和 pauseReason 清晰；
- 中断恢复和 Fix 分支可复现；
- 不依赖 AgentChat 或人工复制 Codex 后续命令。

只有 Gate B 稳定通过后，才能开始 Step27 正式 Web Provider 接入。

# 阶段四：正式接入 AgentChat Web Provider

## Step27：WebProvider 协议与出站数据策略

**Status:** Planned

### Goal

建立与具体网页实现无关的 Provider 契约，并在任何真实项目内容外发前执行最小化、扫描、记录和人工审批。

### Why this step exists

网页 Provider 是不稳定且外部的传输层。它不能访问仓库或推进状态，也不能在没有出站策略时接收源码和完整证据。

### Dependencies

- Gate B 通过；
- Step19 Candidate Extractor；
- Step21 状态机；
- 当前 Web Prompt Builder 和敏感路径规则。

### Scope

- 定义 WebProvider request 和 `RawProviderResult`；
- 记录 role、adapter、requestedProvider、actualProvider、fallbackEnabled；
- 记录 attemptId、receiptRunId、stdout、stderr、exitCode、时间、timeout、truncated 和 rawOutputPath；
- 建立 sensitive path filter 和 content pattern scan；
- 生成 redaction report、request hash、included files、redacted items 和 content chars；
- 定义项目 outbound policy；
- 首次外发、源码全文、完整 Diff 或疑似敏感内容时暂停；
- Adapter 只能返回 RawProviderResult。

### Out of scope

- AgentChat 具体进程调用；
- 自动批准出站；
- 大量 Provider；
- 把 Web Provider 作为状态机或 Reviewer 权威；
- 完整 DLP 产品。

### Acceptance criteria

- Provider 只能接收 AgentFlow 显式准备的 payload；
- 每次外发有 request hash 和清单；
- 敏感路径、疑似密钥、Token、个人数据和内网地址触发暂停或过滤；
- 未配置 outbound policy 的项目不能外发；
- RawProviderResult 不直接推进状态；
- Fake Provider 可测试成功、失败、超时和截断。

### Main risks

- 内容扫描误报或漏报；
- redaction 后语义不足；
- stderr 或 raw output 泄露外发内容；
- fallback 实际发送到未经批准的 Provider。

### Human gates

- 项目首次外发；
- 发送源码全文或完整 Diff；
- 检测到疑似敏感数据；
- Provider fallback 超出批准范围；
- 修改 outbound policy。

### Discussion packet

```text
我们正在继续 AgentFlow 项目，目前准备讨论 Step27：WebProvider 协议与出站数据策略。

当前已知基线：
- Gate B 应已证明本地自动链路；现在才开始正式 Web Provider 接入。

本 Step 目标：
- 定义 RawProviderResult 和最小化、扫描、redaction、hash、清单及外发审批策略。

本 Step 暂不包含：
- AgentChat 具体调用、大量 Provider、自动批准外发或 Provider 推进状态。

完成标准：
- Provider 只接收显式 payload，所有外发可审计，敏感或未配置情况必须暂停。

请先帮助我审查该 Step 的范围、风险和验收标准，不要立即扩大到后续 Step，也不要一次给出大量执行操作。
```

## Step28：AgentChatCliProvider

**Status:** Planned

### Goal

将 AgentChat 作为独立、可选、可替换的外部 CLI Provider 接入 WebProvider 契约。

### Why this step exists

AgentChat 已处理 Chrome/CDP 和网页差异，AgentFlow 不应复制这些不稳定实现；只应调用、记录和隔离其结果。

### Dependencies

- Step18 Spike 的 Go 结论；
- Step27 WebProvider 和 outbound policy；
- AgentChat 独立安装目录和 Debug Profile。

### Scope

- 通过 stdin 或临时 Prompt 文件调用 AgentChat；
- 支持 `--from`、严格角色模式和 `--single` 等已确认参数；
- stdout 只作为模型正文；
- stderr 只提取 receipt 和诊断；
- 正式调用要求 receipt；
- doctor 和 smoke 不要求 receipt；
- 将 exit code 映射为 auth、quota、timeout、internal；
- Provider 失败时允许人工 Web fallback；
- 记录 requestedProvider、actualProvider 和 fallback。

### Out of scope

- 复制 AgentChat 的 Playwright、CDP 或 selector；
- 修改 AgentChat 内部实现；
- 多 Provider 并行；
- Provider 直接写 `.agent` 状态；
- 自动绕过登录或验证码。

### Acceptance criteria

- 正式调用产生 RawProviderResult 和可核对 receipt；
- stdout、stderr、receipt 和 exit code 边界明确；
- strict role 与高可用 fallback 行为可配置并有测试；
- 失败不会推进 AgentFlow 状态；
- doctor/smoke 和正式调用可区分；
- **Needs verification:** 当前 AgentChat 是否支持 `--only`，以及它与 `--from`、`--single` 的准确语义；
- **Needs verification:** 所选 AgentChat CLI 入口的正式 receipt 字段和稳定格式。

### Main risks

- AgentChat CLI 参数或 receipt 格式变化；
- 网页 DOM 变更；
- fallback 到未经批准的 Provider；
- stderr 诊断被误当成模型正文；
- 临时 Prompt 文件残留敏感内容。

### Human gates

- 选择 strict role 或 fallback 模式；
- 登录和 Debug Profile 管理由人工完成；
- receipt 缺失的正式调用不得自动继续；
- 人工 Web fallback 返回的内容仍按 Candidate 处理。

### Discussion packet

```text
我们正在继续 AgentFlow 项目，目前准备讨论 Step28：AgentChatCliProvider。

当前已知基线：
- Step18 应已验证基本兼容性，Step27 应已定义 Provider 和出站策略；AgentChat 参数与 receipt 仍需按实际版本确认。

本 Step 目标：
- 以外部 CLI Adapter 调用 AgentChat，记录正文、诊断、receipt、Provider 和失败分类。

本 Step 暂不包含：
- 复制 AgentChat 浏览器代码、多 Provider 并行、验证码绕过或直接推进状态。

完成标准：
- 正式调用可审计、可失败、可替换，receipt 缺失或 Provider 越界时安全暂停。

请先帮助我审查该 Step 的范围、风险和验收标准，不要立即扩大到后续 Step，也不要一次给出大量执行操作。
```

## Step29：Web Planner 自动接入

**Status:** Planned

### Goal

将 Goal 和受控 Context 自动交给 AgentChat Planner，并将合法结果保存为等待人工批准的 DRAFT。

### Why this step exists

当前 Web Plan 仍需人工复制。正式 Provider 和出站策略完成后，可以消除复制过程，但不能消除人工审批。

### Dependencies

- Step28 AgentChatCliProvider；
- Step27 outbound policy；
- Step19 Candidate Extractor；
- Step20 command policy；
- Step21 状态机。

### Scope

- Build Context；
- 执行 Outbound Policy；
- 生成 Plan Prompt；
- 调用 AgentChat；
- 保存 RawProviderResult 和原始输出；
- 提取并校验 TaskPacket；
- 校验验收意图和命令策略；
- 创建 DRAFT；
- 记录来源、request hash 和 receipt。

### Out of scope

- Planner 自动批准自己生成的任务；
- Planner 直接执行代码；
- 未经出站批准发送完整仓库；
- 自动修复语义不完整计划；
- 多 Planner 仲裁。

### Acceptance criteria

流程可以完成：

```text
Build Context
→ Outbound Policy
→ Generate Plan Prompt
→ AgentChat Invoke
→ Save Raw Output
→ Extract TaskPacket
→ Schema Validate
→ Command Policy Validate
→ Create DRAFT
→ Wait for Human Approval
```

且 Provider 失败、候选歧义和策略不通过均暂停。

### Main risks

- Context Pack 过大或过期；
- Planner 生成任意命令；
- fallback Provider 与角色预期不一致；
- DRAFT 创建前部分产物已写入。

### Human gates

- 首次项目内容外发；
- TaskPacket 人工批准；
- Provider fallback 越界；
- 计划缺失 scope、约束或验收意图时人工处理。

### Discussion packet

```text
我们正在继续 AgentFlow 项目，目前准备讨论 Step29：Web Planner 自动接入。

当前已知基线：
- WebProvider、出站策略和 AgentChat Adapter 应已完成；当前 Web Plan 仍依赖人工复制。

本 Step 目标：
- 自动调用 Planner、保存原始结果、校验 TaskPacket，并只创建等待人工批准的 DRAFT。

本 Step 暂不包含：
- 自动批准、自动执行、完整仓库外发或多 Planner 仲裁。

完成标准：
- 计划链路无需人工复制，任何 Provider/Schema/Policy 问题安全暂停，Planner 永不自批。

请先帮助我审查该 Step 的范围、风险和验收标准，不要立即扩大到后续 Step，也不要一次给出大量执行操作。
```

## Step30：Advisory Web Reviewer

**Status:** Planned

### Goal

自动获取 Web Review 建议，但将最终 verdict 保留为人工确认和本地确定性 Gate。

### Why this step exists

网页 Reviewer 可以补充独立审查，但其输出仍是不可信候选，不能单独宣布代码可提交。

### Dependencies

- Step28 AgentChatCliProvider；
- Step27 outbound policy；
- Step23 完整 Evidence；
- Step21 状态机；
- 当前 Web Review Prompt 和 ReviewResult Schema。

### Scope

- Build Evidence Pack；
- 执行 Outbound Policy；
- 调用 AgentChat Reviewer；
- 保存 RawProviderResult；
- 提取并校验 ReviewResult；
- 进入 `REVIEW_RECEIVED` 或等价候选状态；
- 默认 `reviewPolicy: advisory`；
- 人工确认 verdict 后才执行状态迁移；
- changes_required 可生成 Fix Draft；
- replan_required 只能生成候选新计划。

### Out of scope

- Web Reviewer 自动批准提交；
- authoritative 模式；
- Reviewer 直接修改代码；
- 自动无限 Fix/Replan；
- 用 Web Review 替代 tests 或 Git Evidence。

### Acceptance criteria

流程可以完成：

```text
Build Evidence Pack
→ Outbound Policy
→ AgentChat Invoke
→ Save Raw Output
→ Extract ReviewResult
→ Schema Validate
→ REVIEW_RECEIVED
→ Human Confirms Verdict
→ State Transition
```

并且：

- approved 需人工确认后才进入 REVIEW_APPROVED；
- changes_required 生成的 Fix Draft 重新执行前必须批准；
- replan_required 只生成候选计划；
- rejected 停止并要求人工处理。

### Main risks

- Review Evidence 不完整；
- Provider 把模板 JSON 当结果；
- approved 被错误当作自动 Checkpoint；
- Diff 外发包含敏感信息；
- Reviewer 与 Planner 使用同一模型产生偏差。

### Human gates

- Web Review 最终 verdict；
- Fix TaskPacket 批准；
- Replan 候选批准；
- Evidence 外发；
- authoritative 模式不在当前路线自动启用。

### Discussion packet

```text
我们正在继续 AgentFlow 项目，目前准备讨论 Step30：Advisory Web Reviewer。

当前已知基线：
- AgentChat Adapter 和完整 Git/Test Evidence 应已具备；Web 输出始终是候选。

本 Step 目标：
- 自动获取并校验 ReviewResult，但只进入 REVIEW_RECEIVED，最终 verdict 由人工确认。

本 Step 暂不包含：
- authoritative Reviewer、自动批准提交、直接改代码或无限 Fix/Replan。

完成标准：
- Review 无需人工复制，approved/changes/replan/rejected 都经过明确人工 Gate 和状态机。

请先帮助我审查该 Step 的范围、风险和验收标准，不要立即扩大到后续 Step，也不要一次给出大量执行操作。
```

## Step31：完整受控闭环

**Status:** Planned

### Goal

在不新增大量基础能力的前提下，把已实现的本地 Action Engine、Codex Executor、Web Planner/Reviewer 和人工 Gate 组合成受控集成流程。

### Why this step exists

独立组件通过不等于完整工作流可靠。需要一个明确集成里程碑验证暂停、恢复、Fix/Replan 和上限策略。

### Dependencies

- Step16～Step30 全部完成；
- Gate A、Gate B 通过；
- Fake/Stub Provider 集成测试可用。

### Scope

- 先用 Stub Provider 覆盖 approved、changes_required、replan_required、malformed、timeout 和 unavailable；
- 再用真实 AgentChat 完成受控闭环；
- 串联 Export、Execute、Import、Verify、Git Evidence、Web Review、Human Verdict Gate、Fix/Replan 和 Checkpoint；
- 设置 maxFixRuns、maxReplans、maxTotalDuration 和 Provider retry；
- 相同错误重复时停止；
- 所有人工门生成 pauseReason；
- 验证中断恢复。

### Out of scope

- 新 Provider；
- 自动 commit/push/merge；
- authoritative Web Reviewer；
- 无限自动修复；
- 为集成临时增加新的大型基础架构。

### Acceptance criteria

目标流程可受控运行：

```text
Export
→ Execute
→ Import
→ Verify
→ Git Evidence
→ Web Review
→ Human Verdict Gate
→ Fix/Replan
→ Checkpoint
```

并且：

- Stub 和真实 AgentChat 路径均有证据；
- 所有上限生效；
- 中断后可保守恢复；
- 不存在静默无限循环；
- commit、push、merge 仍为人工动作。

### Main risks

- 集成 Step 吸收未完成的基础工作；
- Provider 不稳定掩盖 Action Engine 问题；
- Fix/Replan 循环状态复杂；
- 总时限与单次时限冲突；
- 人工 Gate 被“便利”选项绕过。

### Human gates

- TaskPacket 批准和 workspace-write；
- outbound policy 和首次外发；
- Web Review verdict；
- UNCERTAIN 动作；
- Fix/Replan 上限；
- Checkpoint 后 commit、push、merge。

### Discussion packet

```text
我们正在继续 AgentFlow 项目，目前准备讨论 Step31：完整受控闭环。

当前已知基线：
- 本地 Action Engine、Codex 自动续流、AgentChat Planner 和 Advisory Reviewer 应已分别完成并验收。

本 Step 目标：
- 先用 Stub、再用真实 AgentChat 串联到 Checkpoint，并验证上限、暂停和恢复。

本 Step 暂不包含：
- 新 Provider、authoritative Review、自动 commit/push/merge 或新的大型基础能力。

完成标准：
- 全流程受控运行，循环有上限，人工门不可绕过，中断后可以保守恢复。

请先帮助我审查该 Step 的范围、风险和验收标准，不要立即扩大到后续 Step，也不要一次给出大量执行操作。
```

# 阶段五：真实价值验证与整理

## Step32：正式价值验证与对照实验

**Status:** Planned

### Goal

用真实 Java 项目和预先定义的指标判断 AgentFlow 是否比纯 Codex 工作方式更有价值，而不是预设结论。

### Why this step exists

工程闭环可运行不等于值得长期维护。项目需要用实际耗时、人工摩擦、恢复和最终质量证明或否定自身价值。

### Dependencies

- Step31 受控闭环稳定；
- 至少一个适合重复或匹配比较的真实 Java 项目/fixture；
- 可记录时间、操作和结果的实验模板。

### Scope

- Mode A：纯 Codex 讨论和执行；
- Mode B：AgentFlow 管理任务、执行、验证、审查和恢复；
- 使用难度和规模接近的任务；
- 预先定义并记录手工复制、人工确认、总耗时、Codex 次数、返工、一次通过率、Review findings、上下文字符量、恢复难度和最终质量；
- 记录 AgentFlow 自身故障和维护成本；
- 根据结果决定保留、简化或停止的能力。

### Out of scope

- 为证明 AgentFlow 优越而挑选任务；
- 用完全不同难度任务直接比较；
- 只比较 Token；
- 在实验中临时新增功能；
- 对外发布未经解释的性能结论。

### Acceptance criteria

- Mode A / B 任务具有可解释的可比性；
- 指标在实验前确定；
- 原始记录可复核；
- 结论包含优势、劣势、成本和不确定性；
- 明确哪些 artifact、Gate 或 Provider 值得保留；
- 不预设 AgentFlow 一定更优。

### Main risks

- 样本过少；
- 学习效应和任务差异污染比较；
- 人工计时不准确；
- 把稳定性问题误判为产品价值问题。

### Human gates

- 人工确认实验任务可比性；
- 人工审查指标和结论；
- 是否继续投入由结果决定，不自动进入体验扩展。

### Discussion packet

```text
我们正在继续 AgentFlow 项目，目前准备讨论 Step32：正式价值验证与对照实验。

当前已知基线：
- Step31 应已形成稳定受控闭环，但尚未证明它优于纯 Codex 工作方式。

本 Step 目标：
- 用可比的真实 Java 任务对照 Mode A 和 Mode B，预先定义指标并如实记录成本与收益。

本 Step 暂不包含：
- 为证明 AgentFlow 优越而挑选任务、只比较 Token 或在实验中临时加功能。

完成标准：
- 得到可复核且允许否定 AgentFlow 价值的对照结论，并决定保留、简化或停止内容。

请先帮助我审查该 Step 的范围、风险和验收标准，不要立即扩大到后续 Step，也不要一次给出大量执行操作。
```

## Step33：使用体验、Context、Skill 和文档

**Status:** Planned

### Goal

根据真实使用和对照实验整理日常体验、上下文分层、Skill 入口和工程展示材料。

### Why this step exists

只有核心可靠性和实际价值经过验证后，才适合压缩命令、优化 Context 和制作完整文档，避免为未证明的流程包装体验。

### Dependencies

- Step32 对照结论；
- 已确定保留的核心流程和 artifact；
- 真实 Java 案例和验收证据。

### Scope

- verbose status；
- 统一 pause/resume 提示；
- Project Pack / Step Pack / Evidence Pack；
- 轻量 Codex Skill 入口；
- 安装文档和 AgentChat 配置向导；
- 真实 Java 案例；
- 架构图和完整流程图；
- 安全边界、对照实验结果、项目限制和停止标准；
- 删除或合并被实验判定为冗余的 artifact。

### Out of scope

- GUI、SaaS、多用户；
- 大规模 Provider 扩展；
- 在 Skill 中重新实现状态机和安全策略；
- 隐藏人工 Gate；
- 因展示需要夸大未验证能力。

### Acceptance criteria

- 日常操作不要求记忆大量底层命令；
- Skill 只调用可靠 CLI，不复制控制内核；
- Context 按角色和预算分层；
- 新环境可按文档安装和运行；
- README 能解释问题、边界、证据和真实效果；
- 文档明确停止标准和未实现能力。

### Main risks

- 体验封装掩盖安全门；
- Context 优化删除必要证据；
- 文档与实现再次漂移；
- Skill 成为第二套状态机。

### Human gates

- 人工决定删除或合并哪些 artifact；
- 人工审查安装、安全和案例文档；
- 任何 Provider、GUI 或产品化扩展必须另开路线讨论。

### Discussion packet

```text
我们正在继续 AgentFlow 项目，目前准备讨论 Step33：使用体验、Context、Skill 和文档。

当前已知基线：
- Step32 应已给出真实价值结论和应保留的核心流程，可靠性优先工作已经完成。

本 Step 目标：
- 整理 status/pause/resume、Context 分层、轻量 Skill、安装、安全、案例和对照文档。

本 Step 暂不包含：
- GUI、SaaS、多用户、大量 Provider 或在 Skill 中复制控制内核。

完成标准：
- 新环境可运行，日常体验简洁，文档如实说明价值、边界、限制和停止标准。

请先帮助我审查该 Step 的范围、风险和验收标准，不要立即扩大到后续 Step，也不要一次给出大量执行操作。
```

# 自动化边界

## 可以自动执行

- Prompt 生成；
- Provider 调用；
- 唯一合法 Candidate 导入；
- 白名单验收命令；
- Git Evidence；
- Review Prompt；
- verdict 候选分流；
- Checkpoint 生成。

## 必须暂停

- 首次批准 TaskPacket；
- TaskPacket 内容发生变化；
- Codex workspace-write；
- 任意自由 Shell 命令；
- Candidate 歧义；
- 高影响动作状态为 UNCERTAIN；
- 敏感文件；
- 未批准的 mixed baseline；
- Web Provider 首次外发项目内容；
- 超过 Fix / Replan 上限；
- Web Review 最终 verdict；
- commit；
- push；
- merge。

# 路线维护方式

## Roadmap maintenance rules

1. 这份文件只保存长期方向和 Step 边界；
2. 不在这里保存每次执行产生的大量日志；
3. 某个 Step 即将开始时，再创建或更新该 Step 的正式 spec；
4. Step 开始前，先复制其 `Discussion packet` 到 ChatGPT；
5. ChatGPT 和用户讨论后，再生成给 Codex 的规划或执行提示词；
6. Step 完成后，只更新：
   - Status；
   - 实际完成内容；
   - 验收证据链接；
   - 发现的偏差；
   - 下一入口；
7. 如果实际实现与路线不一致，优先记录现实，不为了符合路线而伪造完成状态；
8. 远期 Step 可以修改、合并或删除；
9. 当前 Active Step 同一时间原则上只有一个；
10. 不要在完成一个 Step 时自动开始下一个 Step。

## Current entry point

```text
Current active step: None
Next candidate step: Step16
Next action: Discuss Step16 scope and verification plan before implementation
```
