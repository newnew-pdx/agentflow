import { Command } from 'commander';
import { approveCommand } from './commands/approve.js';
import { buildContextCommand } from './commands/build-context.js';
import { exportTaskCommand } from './commands/export-task.js';
import { gitCheckCommand } from './commands/git-check.js';
import { importReviewCommand } from './commands/import-review.js';
import { importResultCommand } from './commands/import-result.js';
import { initCommand } from './commands/init.js';
import { planCommand } from './commands/plan.js';
import { showReviewCommand } from './commands/show-review.js';
import { statusCommand } from './commands/status.js';
import { validateCommand } from './commands/validate.js';
import { verifyCommand } from './commands/verify.js';

export function createCli(): Command {
  const program = new Command();

  // 所有命令都从这里注册；后续 plan/execute/review 会继续挂到同一个 CLI 入口上。
  program
    .name('agentflow')
    .description('Local orchestration for AI-assisted development workflows')
    .version('0.1.0');

  program
    .command('init')
    .description('Initialize an AgentFlow workspace in the current directory')
    .action(initCommand);

  program
    .command('status')
    .description('Show the current AgentFlow project status')
    .action(statusCommand);

  program
    .command('plan')
    .description('Plan work for a goal and create a draft Step')
    .argument('<goal>', 'goal to plan')
    .action(planCommand);

  program
    .command('approve')
    .description('Approve a planned Step')
    .argument('<stepId>', 'Step ID, for example S001')
    .action(approveCommand);

  program
    .command('export-task')
    .description('Export the current TaskPacket for a Step')
    .argument('<stepId>', 'Step ID, for example S001')
    .action(exportTaskCommand);

  program
    .command('import-result')
    .description('Import an ExecutionResult JSON file')
    .argument('<file>', 'ExecutionResult JSON file')
    .action(importResultCommand);

  program
    .command('import-review')
    .description('Import a ReviewResult JSON file')
    .argument('<file>', 'ReviewResult JSON file')
    .action(importReviewCommand);

  program
    .command('show-review')
    .description('Show the current ReviewResult for a Step')
    .argument('<stepId>', 'Step ID, for example S001')
    .action(showReviewCommand);

  program
    .command('verify')
    .description('Run TaskPacket acceptance commands for a Step')
    .argument('<stepId>', 'Step ID, for example S001')
    .action(verifyCommand);

  program
    .command('git-check')
    .description('Collect Git evidence for a Step')
    .argument('<stepId>', 'Step ID, for example S001')
    .action(gitCheckCommand);

  program
    .command('build-context')
    .description('Build the local AgentFlow context pack')
    .action(buildContextCommand);

  program
    .command('validate')
    .description('Validate an AgentFlow protocol JSON file')
    .argument('<file>', 'JSON file to validate')
    .action(validateCommand);

  return program;
}

export async function runCli(argv: readonly string[] = process.argv): Promise<void> {
  await createCli().parseAsync(argv);
}
