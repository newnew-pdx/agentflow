import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Executor, ExecutorInput, ExecutorRunResult } from './executor.js';
import { createTimedResult, writeExecutorOutput } from './executor-run-store.js';

export class ManualExecutor implements Executor {
  readonly name = 'manual' as const;

  async execute(input: ExecutorInput): Promise<ExecutorRunResult> {
    const startedAt = new Date();
    const executionRequest = await readFile(input.executionRequestPath, 'utf8');

    await writeExecutorOutput(
      input.rawOutputPath,
      `# Manual Executor Output

No external executor was called.

Copy the execution request below to your executor, such as Cursor, Codex, or Claude Code. After execution, save the executor response as \`executor-output.md\` or \`execution-result.candidate.md\`, then import it with AgentFlow.

## Execution Request Path

${toRelativePath(input.executionRequestPath)}

## Next

\`\`\`text
Copy execution-request.md to your executor.
After execution, save the output as executor-output.md or execution-result.candidate.md.
Then run:
npm run dev -- import-candidate <file>
\`\`\`

## Execution Request

\`\`\`\`md
${executionRequest}
\`\`\`\`
`,
    );

    return createTimedResult({
      executor: this.name,
      status: 'completed',
      exitCode: 0,
      rawOutputPath: input.rawOutputPath,
      startedAt,
      warnings: ['Manual executor does not run external commands; user execution is still required.'],
    });
  }
}

function toRelativePath(targetPath: string): string {
  return path.relative(process.cwd(), targetPath).replace(/\\/g, '/');
}
