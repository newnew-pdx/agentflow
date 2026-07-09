# Java 微服务项目闭环试运行

本文档说明如何在真实 Java 微服务项目中使用 AgentFlow 跑一轮闭环，验证它不是空框架，而是能服务真实项目开发的本地编排工具。

## 目标

通过一个 Java 微服务改造任务验证 AgentFlow 能否把规划、执行、验证、Git 证据、审查、修复和 checkpoint 串成可恢复、可检查的流程。

## 前提

- AgentFlow 已完成 Step0-Step9。
- Java 微服务项目已经存在。
- 使用 Git worktree 隔离 Codex 工作目录。
- Codex 只在 worktree 中开发，稳定主目录不交给 Codex 打开。

## 推荐目录

```text
agentflow                         ：AgentFlow 稳定主目录，main 分支
agentflow-codex                   ：AgentFlow 开发目录，feature branch
microservice-edu-platform         ：Java 项目稳定主目录，main 分支
microservice-edu-platform-codex   ：Java 项目 Codex 执行目录，feature branch
```

验证通过后再由开发者人工合并到 `main`，不要让 Codex 直接 push `main`。

## 试运行流程

在 Java 项目的 Codex worktree 中初始化并生成上下文：

```bash
agentflow init
agentflow build-context
agentflow make-plan-prompt "为 Java 微服务项目增加统一 TraceId 透传"
```

把 `.agent/generated/web-plan-request.md` 交给网页 AI，保存返回计划为 `docs/web-plan-traceid.md`，然后导入：

```bash
agentflow import-web-plan docs/web-plan-traceid.md
agentflow validate .agent/steps/S001/runs/R001/task.json
agentflow approve S001
agentflow export-task S001
agentflow make-execute-prompt S001
```

手动把 `.agent/steps/S001/runs/R001/execution-request.md` 复制给 Cursor、Codex 或 Claude Code，让执行器在 `microservice-edu-platform-codex` 中完成任务。执行器结束后保存 ExecutionResult JSON。

导入执行结果并采集证据：

```bash
agentflow import-result execution-result.json
agentflow verify S001
agentflow git-check S001
agentflow make-review-prompt S001
```

手动把 `web-review-request.md` 给网页 AI 或 AgentChat skill 审查，保存 ReviewResult 后导入：

```bash
agentflow import-review review-result.json
```

如果审查通过：

```bash
agentflow checkpoint S001
```

如果需要修复：

```bash
agentflow create-fix S001
agentflow approve S001
agentflow export-task S001
agentflow make-execute-prompt S001
```

最终由开发者人工检查、commit，并按团队流程合并。

## 观察指标

- 是否减少重复提示词。
- 是否能从 `.agent/steps` 恢复当前状态。
- 是否每一步都有文件证据。
- 是否能区分 AI 自述与 AgentFlow 重新验证。
- 是否能把网页 AI 的审查结果纳入本地状态。
- 是否避免 Codex 直接操作 main。
- 是否能发现不必要或冗余的文件和命令。
