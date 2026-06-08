export class MySitesApiError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    readonly retryAfter?: string,
  ) {
    super(message);
    this.name = "MySitesApiError";
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "An unexpected error occurred";
}
