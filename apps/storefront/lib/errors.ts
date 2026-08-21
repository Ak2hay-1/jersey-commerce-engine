export class StoreApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
    this.name = 'StoreApiError';
  }
}

export function publicErrorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof StoreApiError) {
    if (error.status >= 500) {
      return fallback;
    }
    return error.message || fallback;
  }
  if (error instanceof TypeError) {
    return 'Could not reach the store. Please try again.';
  }
  if (error instanceof Error && error.message) {
    const message = error.message.toLowerCase();
    if (message.includes('failed to fetch') || message.includes('networkerror') || message.includes('load failed')) {
      return 'Could not reach the store. Please try again.';
    }
    return error.message;
  }
  return fallback;
}
