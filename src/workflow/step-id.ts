const stepIdPattern = /^S(\d{3})$/;
const runIdPattern = /^R(\d{3,})$/;

export function nextStepId(existingStepIds: readonly string[]): string {
  const max = existingStepIds.reduce((currentMax, stepId) => {
    const match = stepIdPattern.exec(stepId);
    if (!match) return currentMax;
    return Math.max(currentMax, Number(match[1]));
  }, 0);

  return formatStepId(max + 1);
}

export function nextRunId(existingRunIds: readonly string[]): string {
  const max = existingRunIds.reduce((currentMax, runId) => {
    const match = runIdPattern.exec(runId);
    if (!match) return currentMax;
    return Math.max(currentMax, Number(match[1]));
  }, 0);

  return formatRunId(max + 1);
}

export function formatStepId(value: number): string {
  return `S${value.toString().padStart(3, '0')}`;
}

export function formatRunId(value: number): string {
  return `R${value.toString().padStart(3, '0')}`;
}

export function isStepId(value: string): boolean {
  return stepIdPattern.test(value);
}
