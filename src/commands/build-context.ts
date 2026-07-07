import { buildContext } from '../memory/context-builder.js';
import { toProjectRelative } from '../memory/memory-layout.js';

export async function buildContextCommand(): Promise<void> {
  try {
    const result = await buildContext();

    console.log('AgentFlow context pack generated.');
    console.log(`Current state: ${toProjectRelative(result.currentStatePath)}`);
    console.log(`Context pack: ${toProjectRelative(result.contextPackPath)}`);
    console.log(`Git repository: ${result.git.repository ? 'yes' : 'no'}`);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to build context pack.';
    console.error(message);
    process.exitCode = 1;
  }
}
