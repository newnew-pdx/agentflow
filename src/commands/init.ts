import path from 'node:path';
import { AGENT_DIRECTORY, getAgentDirectory } from '../utils/path.js';
import { createDirectory, pathExists, writeFileIfMissing } from '../utils/fs.js';

const directories = ['project', 'steps', 'decisions', 'generated'] as const;

const initialFiles: Readonly<Record<string, string>> = {
  'config.yaml': `# AgentFlow project configuration\nversion: 1\nstatus: initialized\n`,
  'project/vision.md': `# Project Vision\n\nDescribe the project's purpose and desired outcomes here.\n`,
  'project/architecture.md': `# Architecture\n\nDocument the current architecture and important boundaries here.\n`,
  'project/constraints.md': `# Constraints\n\nRecord technical, product, and operational constraints here.\n`,
  'current-state.md': `# Current State\n\nStatus: initialized\n\nNo steps have been planned yet.\n`,
  'context-pack.md': `# Context Pack\n\nProject context will be assembled here in a later AgentFlow step.\n`,
};

export async function initCommand(): Promise<void> {
  const root = getAgentDirectory();

  if (await pathExists(root)) {
    console.log(`AgentFlow is already initialized (${AGENT_DIRECTORY} already exists).`);
    console.log('No files were changed.');
    return;
  }

  await createDirectory(root);

  for (const directory of directories) {
    await createDirectory(path.join(root, directory));
  }

  for (const [relativePath, content] of Object.entries(initialFiles)) {
    await writeFileIfMissing(path.join(root, relativePath), content);
  }

  console.log('AgentFlow initialized successfully.');
  console.log(`Created ${AGENT_DIRECTORY} in ${process.cwd()}`);
}
