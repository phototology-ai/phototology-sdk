import type { ErrorResponse } from './types';

/** Regex to match API keys in error messages. */
const API_KEY_PATTERN = /pt_(live|test)_[a-zA-Z0-9_-]+/g;

/** Redact API keys from a string. */
function redactApiKeys(message: string): string {
  return message.replace(API_KEY_PATTERN, '[REDACTED]');
}

/** Options for constructing a PhototologyError. */
export interface PhototologyErrorOptions {
  code: string;
  status: number;
  retryable: boolean;
  requestId: string;
}

/**
 * Base error class for all Phototology API errors.
 *
 * Never includes API keys in error messages.
 */
export class PhototologyError extends Error {
  readonly code: string;
  readonly status: number;
  readonly retryable: boolean;
  readonly requestId: string;

  constructor(message: string, options: PhototologyErrorOptions) {
    super(redactApiKeys(message));
    this.name = 'PhototologyError';
    this.code = options.code;
    this.status = options.status;
    this.retryable = options.retryable;
    this.requestId = options.requestId;
  }

  /**
   * Create the appropriate error subclass from an API error response.
   */
  static fromResponse(
    status: number,
    body: ErrorResponse,
    headers?: Record<string, string>,
  ): PhototologyError {
    const { code, message, retryable, requestId } = body.error;
    const opts: PhototologyErrorOptions = { code, status, retryable, requestId };

    switch (code) {
      case 'AUTH_FAILED':
        return new AuthenticationError(message, opts);
      case 'VALIDATION_FAILED':
      case 'IMAGE_INVALID':
      case 'IMAGE_TOO_LARGE':
      case 'CONTENT_FILTERED':
        return new ValidationError(message, opts);
      case 'RATE_LIMITED': {
        const retryAfter = headers?.['retry-after']
          ? parseInt(headers['retry-after'], 10)
          : undefined;
        return new RateLimitedError(message, opts, retryAfter);
      }
      case 'PARSE_FAILED':
        return new ParseError(message, opts);
      case 'INTERNAL_ERROR':
        return new InternalError(message, opts);
      case 'PROVIDER_UNAVAILABLE':
      case 'PROVIDER_ERROR':
        return new ProviderError(message, opts);
      case 'PLAN_LIMIT_EXCEEDED':
        return new PlanLimitError(message, opts);
      default:
        return new PhototologyError(message, opts);
    }
  }
}

export class AuthenticationError extends PhototologyError {
  constructor(message: string, options: PhototologyErrorOptions) {
    super(message, options);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends PhototologyError {
  constructor(message: string, options: PhototologyErrorOptions) {
    super(message, options);
    this.name = 'ValidationError';
  }
}

export class RateLimitedError extends PhototologyError {
  readonly retryAfter?: number;

  constructor(message: string, options: PhototologyErrorOptions, retryAfter?: number) {
    super(message, options);
    this.name = 'RateLimitedError';
    this.retryAfter = retryAfter;
  }
}

export class ParseError extends PhototologyError {
  constructor(message: string, options: PhototologyErrorOptions) {
    super(message, options);
    this.name = 'ParseError';
  }
}

export class InternalError extends PhototologyError {
  constructor(message: string, options: PhototologyErrorOptions) {
    super(message, options);
    this.name = 'InternalError';
  }
}

export class ProviderError extends PhototologyError {
  constructor(message: string, options: PhototologyErrorOptions) {
    super(message, options);
    this.name = 'ProviderError';
  }
}

export class PlanLimitError extends PhototologyError {
  constructor(message: string, options: PhototologyErrorOptions) {
    super(message, options);
    this.name = 'PlanLimitError';
  }
}
