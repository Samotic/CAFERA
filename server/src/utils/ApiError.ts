import type { ApiErrorCode, FieldError } from '@cafera/shared';

/**
 * The only error type handlers should throw.
 *
 * It carries a status, a machine-readable code and, for validation failures,
 * per-field detail. The `message` is for logs and developers; the client maps
 * the `code` to user-facing copy, which is how raw internals stay off the screen.
 *
 * `isOperational` separates "the request was wrong" from "the server is broken".
 * Operational errors are expected and logged at warn level; anything else is a
 * bug and gets a full error-level log entry with the stack.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly fields?: FieldError[];
  readonly isOperational = true;

  constructor(status: number, code: ApiErrorCode, message: string, fields?: FieldError[]) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    if (fields) this.fields = fields;
    Error.captureStackTrace?.(this, ApiError);
  }

  static badRequest(message = 'Invalid request', fields?: FieldError[]): ApiError {
    return new ApiError(400, 'BAD_REQUEST', message, fields);
  }

  static validation(fields: FieldError[], message = 'Validation failed'): ApiError {
    return new ApiError(422, 'VALIDATION_ERROR', message, fields);
  }

  static unauthorized(
    message = 'Authentication required',
    code: ApiErrorCode = 'UNAUTHORIZED',
  ): ApiError {
    return new ApiError(401, code, message);
  }

  static forbidden(message = 'You do not have access to this resource'): ApiError {
    return new ApiError(403, 'FORBIDDEN', message);
  }

  static notFound(message = 'Not found'): ApiError {
    return new ApiError(404, 'NOT_FOUND', message);
  }

  static conflict(message = 'Already exists', code: ApiErrorCode = 'CONFLICT'): ApiError {
    return new ApiError(409, code, message);
  }

  static tooLarge(message = 'That file is too large'): ApiError {
    return new ApiError(413, 'PAYLOAD_TOO_LARGE', message);
  }

  static unsupportedMedia(message = 'That file type is not supported'): ApiError {
    return new ApiError(415, 'UNSUPPORTED_MEDIA_TYPE', message);
  }

  static rateLimited(message = 'Too many requests'): ApiError {
    return new ApiError(429, 'RATE_LIMITED', message);
  }

  static internal(message = 'Something went wrong'): ApiError {
    return new ApiError(500, 'INTERNAL_ERROR', message);
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}
