import path from 'node:path';
import type { Executor, ExecutorInput, ExecutorRunResult } from './executor.js';
import { createTimedResult, writeExecutorOutput } from './executor-run-store.js';

export class DryRunExecutor implements Executor {
  readonly name = 'dry-run' as const;

  async execute(input: ExecutorInput): Promise<ExecutorRunResult> {
    const startedAt = new Date();

    await writeExecutorOutput(
      input.rawOutputPath,
      `# Dry Run Executor Output

No external executor was called.

This file is generated to verify executor gateway plumbing.

## Planned Inputs

- TaskPacket: ${toRelativePath(input.taskPath)}
- Execution request: ${toRelativePath(input.executionRequestPath)}
- Project root: ${input.projectRoot}
- Step ID: ${input.stepId}
- Run ID: ${input.runId}

## Planned Outputs

- Executor run record: ${toRelativePath(input.executorRunPath)}
- Raw executor output: ${toRelativePath(input.rawOutputPath)}

## Next

Run:

\`\`\`bash
npm run dev -- import-candidate ${toRelativePath(input.rawOutputPath)}
\`\`\`
`,
    );

    return createTimedResult({
      executor: this.name,
      status: 'completed',
      exitCode: 0,
      rawOutputPath: input.rawOutputPath,
      startedAt,
    });
  }
}

function toRelativePath(targetPath: string): string {
  return path.relative(process.cwd(), targetPath).replace(/\\/g, '/');
}
