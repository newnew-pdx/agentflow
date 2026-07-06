import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { planCommand } from './commands/plan.js';
import { statusCommand } from './commands/status.js';

export function createCli(): Command {
  const program = new Command();

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
    .description('Plan work for a goal (placeholder in Step0)')
    .argument('<goal>', 'goal to plan')
    .action(planCommand);

  return program;
}

export async function runCli(argv: readonly string[] = process.argv): Promise<void> {
  await createCli().parseAsync(argv);
}
