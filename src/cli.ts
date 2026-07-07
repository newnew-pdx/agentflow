import { Command } from 'commander';
import { initCommand } from './commands/init.js';
import { planCommand } from './commands/plan.js';
import { statusCommand } from './commands/status.js';
import { validateCommand } from './commands/validate.js';

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
    .description('Plan work for a goal (placeholder in Step0)')
    .argument('<goal>', 'goal to plan')
    .action(planCommand);

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
