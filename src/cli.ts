import { Command } from 'commander';
import { approveCommand } from './commands/approve.js';
import { buildContextCommand } from './commands/build-context.js';
import { checkpointCommand } from './commands/checkpoint.js';
import { createFixCommand } from './commands/create-fix.js';
import { createReplanCommand } from './commands/create-replan.js';
import { exportTaskCommand } from './commands/export-task.js';
import { gitCheckCommand } from './commands/git-check.js';
import { importCandidateCommand } from './commands/import-candidate.js';
import { importReviewCommand } from './commands/import-review.js';
import { importResultCommand } from './commands/import-result.js';
import { importWebPlanCommand } from './commands/import-web-plan.js';
import { initCommand } from './commands/init.js';
import { makeExecutePromptCommand } from './commands/make-execute-prompt.js';
import { makePlanPromptCommand } from './commands/make-plan-prompt.js';
import { makeReviewPromptCommand } from './commands/make-review-prompt.js';
import { nextActionCommand } from './commands/next-action.js';
import { pilotReportCommand } from './commands/pilot-report.js';
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
    .command('make-plan-prompt')
    .description('Generate a Web AI planning prompt')
    .argument('<goal>', 'goal to plan with Web AI')
    .action(makePlanPromptCommand);

  program
    .command('import-web-plan')
    .description('Import a Web AI plan as a draft TaskPacket')
    .argument('<file>', 'Web Plan markdown file')
    .action(importWebPlanCommand);

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
    .command('make-execute-prompt')
    .description('Generate a manual executor prompt from the current TaskPacket')
    .argument('<stepId>', 'Step ID, for example S001')
    .action(makeExecutePromptCommand);

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
    .command('import-candidate')
    .description('Import an AgentFlow protocol candidate from raw AI output')
    .argument('<file>', 'Candidate markdown or JSON file')
    .action(importCandidateCommand);

  program
    .command('show-review')
    .description('Show the current ReviewResult for a Step')
    .argument('<stepId>', 'Step ID, for example S001')
    .action(showReviewCommand);

  program
    .command('make-review-prompt')
    .description('Generate a Web AI review prompt from current Step evidence')
    .argument('<stepId>', 'Step ID, for example S001')
    .action(makeReviewPromptCommand);

  program
    .command('create-fix')
    .description('Create the next fix TaskPacket from the current ReviewResult')
    .argument('<stepId>', 'Step ID, for example S001')
    .action(createFixCommand);

  program
    .command('create-replan')
    .description('Create a replan request from the current ReviewResult')
    .argument('<stepId>', 'Step ID, for example S001')
    .action(createReplanCommand);

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
    .command('checkpoint')
    .description('Summarize readiness before a manual commit')
    .argument('<stepId>', 'Step ID, for example S001')
    .action(checkpointCommand);

  program
    .command('pilot-report')
    .description('Generate a readable pilot report for a Step')
    .argument('<stepId>', 'Step ID, for example S001')
    .action(pilotReportCommand);

  program
    .command('next-action')
    .description('Recommend the next manual AgentFlow command for a Step')
    .argument('<stepId>', 'Step ID, for example S001')
    .action(nextActionCommand);

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
