# Web AI Gateway 设计

Web AI Gateway 是 AgentFlow 面向网页 AI / AgentChat skill 的协议边界。它不负责调用浏览器，也不直接修改仓库，而是提供三件事：生成 prompt、导入结构化输出、把证据整理成审查请求。

## 架构位置

AgentChat 未来可以作为 Web AI Provider，负责把 prompt 发送给 Claude、ChatGPT 或其他网页 AI，并取回输出。AgentFlow 位于本地协议层，负责把这些输出转换为 TaskPacket 或 ReviewResult，并写入 `.agent/steps`。

## 职责边界

- Web AI：生成规划语义、风险、验收建议、审查发现。
- Executor：按已批准的 TaskPacket 修改代码、运行命令、产出结果。
- AgentFlow：补齐系统字段、执行 Zod 校验、写入本地状态、收集 Git 和测试证据。

一句话：AI 负责想，Executor 负责做，AgentFlow 负责验、记、控。

## Prompt Builder、Adapter、Normalizer、Validator

- Prompt Builder：生成 `web-plan-request.md` 和 `web-review-request.md`。
- Adapter：后续接入 AgentChat skill 或其他网页 AI 调用层，目前尚未实现。
- Normalizer：把 Web AI 的候选 JSON 补齐为 AgentFlow 协议对象。
- Validator：使用现有 Zod schema 校验 TaskPacket、ExecutionResult、ReviewResult。

## 字段归属

Web AI 可以生成：

- `goal`
- `background`
- `scope`
- `outOfScope`
- `contextFiles`
- `constraints`
- `acceptanceCommands`
- `requiresApproval`
- ReviewResult 中的 `verdict`、`summary`、`findings`、`suggestedNextAction`

AgentFlow 必须补齐或控制：

- `protocolVersion`
- `stepId`
- `runId`
- `createdAt`
- `.agent/steps` 写入位置
- Step 状态推进
- Git evidence、tests、checkpoint 等本地证据

## 安全原因

不允许网页 AI 直接改代码或推进状态，是为了避免不可验证输出直接影响仓库。AI 输出可能遗漏上下文、误读 diff、产生格式错误或要求读取敏感文件；因此必须先进入 import / validate 流程，由 AgentFlow 记录来源、校验字段并保持人工审批边界。

## 后续接入 AgentChat Skill

后续可以新增 `AgentChatSkillAdapter`：读取 AgentFlow 生成的 prompt，调用 AgentChat skill，保存网页 AI 返回文本，然后交给 `import-web-plan` 或 `import-review`。即使接入自动调用，Adapter 仍不应绕过 Normalizer 和 Validator，也不应直接写业务代码或 push。
