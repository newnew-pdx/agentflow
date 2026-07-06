import path from 'node:path';
import { countDirectoryEntries, pathExists } from '../utils/fs.js';
import { getAgentDirectory } from '../utils/path.js';

export async function statusCommand(): Promise<void> {
  const root = getAgentDirectory();

  if (!(await pathExists(root))) {
    console.log('AgentFlow is not initialized. Run `agentflow init` first.');
    return;
  }

  const steps = await countDirectoryEntries(path.join(root, 'steps'));

  console.log('AgentFlow project detected.');
  console.log('Current status: initialized');
  console.log(`Steps: ${steps}`);
}
