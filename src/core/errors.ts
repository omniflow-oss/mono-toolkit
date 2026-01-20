export enum ExitCode {
  Success = 0,
  TaskFailed = 1,
  InvalidConfig = 2,
  DockerMissing = 3,
  GitMissing = 4,
  RootNotFound = 5
}

export class ToolkitError extends Error {
  readonly code: ExitCode;
  readonly details?: Record<string, unknown>;

  constructor(message: string, code: ExitCode, details?: Record<string, unknown>) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export const asError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }
  return new Error(String(error));
};
