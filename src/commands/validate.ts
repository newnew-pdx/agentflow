import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateProtocol } from '../protocols/index.js';

// 把 Zod 的路径数组转成人类更容易定位的字段路径。
function formatPath(path: PropertyKey[]): string {
  return path.length === 0 ? '<root>' : path.map(String).join('.');
}

export async function validateCommand(file: string): Promise<void> {
  let source: string;
  try {
    // validate 接收用户传入的相对路径；resolve 后按当前工作目录读取。
    source = await readFile(resolve(file), 'utf8');
  } catch (error: unknown) {
    const notFound = error instanceof Error && 'code' in error && error.code === 'ENOENT';
    console.error(notFound ? `file not found: ${file}` : `file read failed: ${file}`);
    process.exitCode = 1;
    return;
  }

  let data: unknown;
  try {
    // JSON 语法错误和协议字段错误分开处理，方便用户判断该改文件格式还是改字段内容。
    data = JSON.parse(source);
  } catch (error: unknown) {
    const reason = error instanceof Error ? error.message : 'invalid JSON syntax';
    console.error(`JSON parse failed: ${reason}`);
    process.exitCode = 1;
    return;
  }

  const result = validateProtocol(data);
  if (!result.success) {
    console.error('validation failed');
    console.error(`protocol type: ${result.type}`);
    if (result.error) {
      for (const issue of result.error.issues) {
        console.error(`- ${formatPath(issue.path)}: ${issue.message}`);
      }
    } else {
      // unknown 通常意味着缺少协议特征字段，例如 TaskPacket 没有 goal/scope。
      console.error('- <root>: unable to detect protocol type from required fields');
    }
    process.exitCode = 1;
    return;
  }

  console.log(`protocol type: ${result.type}`);
  console.log(`stepId: ${result.data.stepId}`);
  if ('runId' in result.data && result.data.runId !== undefined) {
    console.log(`runId: ${result.data.runId}`);
  }
  console.log('validation passed');
}
