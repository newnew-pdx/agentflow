export class AgentFlowError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'AgentFlowError';
  }
}

export function formatError(error: unknown): string {
  if (error instanceof Error) {
    return `AgentFlow error: ${error.message}`;
  }

  return 'AgentFlow error: An unknown error occurred.';
}
