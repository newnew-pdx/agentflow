# Web Plan: Java 微服务 JWT 认证

## Goal

为 Java 微服务项目增加 JWT 认证与用户上下文透传。

## Background

当前服务需要在 API 层识别调用方身份，并把用户 ID、角色等上下文传递给下游业务逻辑。实现应尽量贴合现有项目结构，不引入大范围重构。

## Scope

- 增加 JWT 解析和校验入口。
- 增加认证过滤器或拦截器，把用户上下文写入请求上下文。
- 为未认证、token 过期、签名错误等场景补充测试。
- 更新必要的 README 或配置说明。

## Out of Scope

- 不实现完整用户注册和登录系统。
- 不接入外部 OAuth/OIDC 服务。
- 不重构已有业务模块。

## Acceptance Commands

- npm run build

## Constraints

- 不读取或提交 .env、私钥、token、证书。
- JWT 密钥或公钥配置只使用占位说明，不写入真实密钥。
- 每次修改必须能通过现有构建命令验证。

## Risks

- 认证过滤器顺序错误可能导致公开接口被误拦截。
- 用户上下文如果使用全局变量可能出现并发污染。

## Suggested Step Title

JWT 认证与用户上下文透传

## TaskPacket JSON Candidate

```json
{
  "goal": "为 Java 微服务项目增加 JWT 认证与用户上下文透传。",
  "background": "当前服务需要在 API 层识别调用方身份，并把用户 ID、角色等上下文传递给下游业务逻辑。实现应尽量贴合现有项目结构，不引入大范围重构。",
  "scope": [
    "增加 JWT 解析和校验入口。",
    "增加认证过滤器或拦截器，把用户上下文写入请求上下文。",
    "为未认证、token 过期、签名错误等场景补充测试。",
    "更新必要的 README 或配置说明。"
  ],
  "outOfScope": [
    "不实现完整用户注册和登录系统。",
    "不接入外部 OAuth/OIDC 服务。",
    "不重构已有业务模块。"
  ],
  "contextFiles": [
    ".agent/generated/context-pack.md",
    "AGENTS.md",
    "README.md"
  ],
  "constraints": [
    "不读取或提交 .env、私钥、token、证书。",
    "JWT 密钥或公钥配置只使用占位说明，不写入真实密钥。",
    "每次修改必须能通过现有构建命令验证。"
  ],
  "acceptanceCommands": [
    "npm run build"
  ],
  "requiresApproval": true
}
```
