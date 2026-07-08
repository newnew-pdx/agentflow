import { pathExists } from '../utils/fs.js';
import { getAgentDirectory } from '../utils/path.js';
import { collectGitEvidence } from '../git/git-inspector.js';

export async function gitCheckCommand(stepId: string): Promise<void> {
  if (!(await pathExists(getAgentDirectory()))) {
    console.error('AgentFlow is not initialized. Run `agentflow init` first.');
    process.exitCode = 1;
    return;
  }

  const evidence = await collectGitEvidence(stepId);
  if (!evidence) {
    console.error(`Step ${stepId} not found.`);
    process.exitCode = 1;
    return;
  }

  console.log(`Git evidence collected for ${stepId} / ${evidence.runId}`);
  if (!evidence.isGitRepository) {
    console.log('Git repository: false');
    return;
  }

  console.log(`Branch: ${evidence.branch || '(detached)'}`);
  console.log(`Changed files: ${evidence.changedFiles.length}`);
  if (evidence.diffPatchPath) {
    console.log(`Patch: ${evidence.diffPatchPath}`);
  }
  for (const warning of evidence.safety.warnings) {
    console.warn(`Warning: ${warning}`);
  }
}
