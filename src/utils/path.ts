import path from 'node:path';

export const AGENT_DIRECTORY = '.agent';

export function getAgentDirectory(cwd: string = process.cwd()): string {
  return path.resolve(cwd, AGENT_DIRECTORY);
}
