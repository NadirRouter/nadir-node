/** Base error for all Nadir API errors. */
export class NadirError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly errorType: string | undefined;

  constructor(
    message: string,
    options: { status?: number; body?: unknown; errorType?: string } = {},
  ) {
    super(message);
    this.name = "NadirError";
    this.status = options.status ?? 0;
    this.body = options.body;
    this.errorType = options.errorType;
  }
}

/** Raised on 401 Unauthorized — invalid or missing API key. */
export class AuthenticationError extends NadirError {
  constructor(message: string, body?: unknown) {
    super(message, { status: 401, body });
    this.name = "AuthenticationError";
  }
}

/** Raised on 429 Too Many Requests. */
export class RateLimitError extends NadirError {
  readonly retryAfter: number | undefined;

  constructor(
    message: string,
    options: { body?: unknown; retryAfter?: number } = {},
  ) {
    super(message, { status: 429, body: options.body });
    this.name = "RateLimitError";
    this.retryAfter = options.retryAfter;
  }
}

/** Raised on server errors (4xx/5xx) not covered by a more specific class. */
export class APIError extends NadirError {
  constructor(message: string, status: number, body?: unknown) {
    super(message, { status, body });
    this.name = "APIError";
  }
}

/** Raised when the SDK cannot reach the Nadir API. */
export class ConnectionError extends NadirError {
  constructor(message: string) {
    super(message, { status: 0 });
    this.name = "ConnectionError";
  }
}
