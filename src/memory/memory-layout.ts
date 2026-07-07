import path from 'node:path';
import { AGENT_DIRECTORY, getAgentDirectory } from '../utils/path.js';

export const generatedDirectory = 'generated';

export interface MemoryLayout {
  cwd: string;
  agentRoot: string;
  config: string;
  project: {
    vision: string;
    architecture: string;
    constraints: string;
  };
  stepsRoot: string;
  decisionsRoot: string;
  generatedRoot: string;
  generated: {
    currentState: string;
    contextPack: string;
  };
  agents: string;
  readme: string;
}

export function getMemoryLayout(cwd: string = process.cwd()): MemoryLayout {
  const agentRoot = getAgentDirectory(cwd);
  const generatedRoot = path.join(agentRoot, generatedDirectory);

  return {
    cwd,
    agentRoot,
    config: path.join(agentRoot, 'config.yaml'),
    project: {
      vision: path.join(agentRoot, 'project', 'vision.md'),
      architecture: path.join(agentRoot, 'project', 'architecture.md'),
      constraints: path.join(agentRoot, 'project', 'constraints.md'),
    },
    stepsRoot: path.join(agentRoot, 'steps'),
    decisionsRoot: path.join(agentRoot, 'decisions'),
    generatedRoot,
    generated: {
      currentState: path.join(generatedRoot, 'current-state.md'),
      contextPack: path.join(generatedRoot, 'context-pack.md'),
    },
    agents: path.join(cwd, 'AGENTS.md'),
    readme: path.join(cwd, 'README.md'),
  };
}

export function toProjectRelative(targetPath: string, cwd: string = process.cwd()): string {
  const relativePath = path.relative(cwd, targetPath).replaceAll(path.sep, '/');
  return relativePath === '' ? '.' : relativePath;
}

export { AGENT_DIRECTORY };
