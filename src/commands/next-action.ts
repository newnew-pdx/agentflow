import { assertInitialized } from '../workflow/step-store.js';
import { getNextAction } from '../next-action/next-action.js';

export async function nextActionCommand(stepId: string): Promise<void> {
  if (!(await assertInitialized())) {
    console.error('AgentFlow is not initialized. Run `agentflow init` first.');
    process.exitCode = 1;
    return;
  }

  const recommendation = await getNextAction(stepId);
  if (!recommendation) {
    console.error(`Step ${stepId} not found.`);
    process.exitCode = 1;
    return;
  }

  console.log(`Step ${recommendation.stepId}`);
  console.log(`Status: ${recommendation.status}`);
  console.log(`Current Run: ${recommendation.runId}`);
  console.log();
  console.log('Recommended next action:');
  if (recommendation.commands.length === 0) {
    console.log('无可自动建议的命令，请先处理下方原因。');
  } else {
    recommendation.commands.forEach((command, index) => {
      console.log(`${index + 1}. ${command}`);
    });
  }

  if (recommendation.note && recommendation.note.length > 0) {
    console.log();
    console.log('Note:');
    for (const line of recommendation.note) {
      console.log(line);
    }
  }

  console.log();
  console.log('Reason:');
  for (const line of recommendation.reason) {
    console.log(line);
  }
}
