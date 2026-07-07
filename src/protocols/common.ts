import { z } from 'zod';

// 当前所有协议共用同一个版本号，后续协议字段升级时可以用它做兼容判断。
export const PROTOCOL_VERSION = 'agentflow.v1' as const;
export const protocolVersionSchema = z.literal(PROTOCOL_VERSION);

// stepId / runId 使用稳定、短小的机器可读编号，方便日志、文件名和多 Agent 之间引用。
export const stepIdSchema = z.string().regex(/^S\d{3}$/, 'stepId must match the format S001.');
export const runIdSchema = z.string().regex(/^R\d{3,}$/, 'runId must match the format R001.');

// 要求带时区的 ISO 时间，避免不同运行环境之间出现本地时间歧义。
export const createdAtSchema = z.iso.datetime({ offset: true });
export const severitySchema = z.enum(['low', 'medium', 'high', 'critical']);

export type Severity = z.infer<typeof severitySchema>;
