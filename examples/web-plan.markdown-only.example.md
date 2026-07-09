# Web Plan: Java 微服务 JWT 认证

## Goal

为 Java 微服务项目增加 JWT 认证与用户上下文透传。

## Background

服务需要在请求进入业务逻辑前完成身份识别，并把用户上下文传给后续处理链路。

## Scope

- 增加 JWT token 解析和签名校验。
- 增加请求级用户上下文对象。
- 补充认证成功和失败路径测试。

## Out of Scope

- 不实现登录页面。
- 不存储真实密钥。
- 不重写业务控制器。

## Acceptance Commands

- npm run build

## Constraints

- 不读取 .env、密钥、token、私有证书。
- 保持 Step 范围可独立验收。
- 只做认证入口和上下文透传相关修改。
