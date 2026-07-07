import type { ZodError } from 'zod';
import { executionResultSchema, type ExecutionResult } from './execution-result.js';
import { reviewResultSchema, type ReviewResult } from './review-result.js';
import { taskPacketSchema, type TaskPacket } from './task-packet.js';

export * from './common.js';
export * from './execution-result.js';
export * from './review-result.js';
export * from './task-packet.js';

export type ProtocolType = 'task-packet' | 'execution-result' | 'review-result';
export type ProtocolData = TaskPacket | ExecutionResult | ReviewResult;
export type ProtocolValidationResult =
  | { success: true; type: ProtocolType; data: ProtocolData }
  | { success: false; type: ProtocolType | 'unknown'; error?: ZodError };

// Zod 校验前先做最小对象判断，避免对 null、数组等非协议输入误判。
function isRecord(data: unknown): data is Record<string, unknown> {
  return typeof data === 'object' && data !== null && !Array.isArray(data);
}

export function detectProtocolType(data: unknown): ProtocolType | 'unknown' {
  if (!isRecord(data)) return 'unknown';

  // 用少量“特征字段”识别协议类型：足够快，也避免先尝试所有 schema 造成错误信息混乱。
  // 如果同时匹配多个类型，说明输入形状有歧义，交给调用方按 unknown 处理。
  const matches: ProtocolType[] = [];
  if ('goal' in data && 'scope' in data) matches.push('task-packet');
  if ('status' in data && 'filesChanged' in data) matches.push('execution-result');
  if ('verdict' in data && 'findings' in data) matches.push('review-result');

  return matches.length === 1 ? matches[0]! : 'unknown';
}

export function validateProtocol(data: unknown): ProtocolValidationResult {
  const type = detectProtocolType(data);
  if (type === 'unknown') return { success: false, type };

  // 识别类型之后只跑对应 schema，返回给 CLI 的错误就会聚焦在当前协议本身。
  const schema = {
    'task-packet': taskPacketSchema,
    'execution-result': executionResultSchema,
    'review-result': reviewResultSchema,
  }[type];
  const result = schema.safeParse(data);

  return result.success
    ? { success: true, type, data: result.data }
    : { success: false, type, error: result.error };
}
