import { createPilotReport } from '../pilot/pilot-report.js';

export async function pilotReportCommand(stepId: string): Promise<void> {
  try {
    const result = await createPilotReport(stepId);
    if (!result) {
      console.error(`Step ${stepId} not found.`);
      process.exitCode = 1;
      return;
    }

    console.log(`Pilot report generated for ${result.stepId}.`);
    console.log(`Runs: ${result.runIds.length > 0 ? result.runIds.join(', ') : 'none'}`);
    console.log(`Report: ${result.reportPath}`);
  } catch (error: unknown) {
    console.error(error instanceof Error ? error.message : 'Failed to generate pilot report.');
    process.exitCode = 1;
  }
}
