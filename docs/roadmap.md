# AgentFlow 路线图

路线图用于说明实现顺序，不代表所列能力已经完成。

## Step0：CLI 项目骨架（已完成）

- 建立 TypeScript + Node.js 项目；
- 提供 `init`、`status` 和占位版 `plan` 命令；
- 创建本地 `.agent/` 工作区；
- 建立共享类型、错误处理、文件工具和协议目录；
- 补充构建、运行与验收文档。

详细说明见 [Step0：CLI 项目骨架](steps/step0-cli-skeleton.md)。

## Step1：核心协议

- 定义版本化的 `TaskPacket`；
- 定义 `ExecutionResult` 和 `ReviewResult`；
- 使用 Zod 实现运行时校验；
- 为有效和无效协议样例补充测试。

## 后续阶段：状态与执行闭环

- 接入规划器和人工审批流程；
- 引入 SQLite 状态存储和流程状态机；
- 接入 Codex、AgentChat 等执行或协作组件；
- 增加测试验证、审查、修复和重新规划；
- 编排 Git 提交并更新项目记忆和 Context Pack。

后续范围将根据前一步协议和验收结果继续拆分，避免一次引入过多复杂度。
