/**
 * Transport-level contracts. Every CAFERA endpoint answers with one of these two
 * envelopes and nothing else, so the client can narrow on `success` alone.
 */

export interface ApiSuccess<TData> {
  success: true;
  data: TData;
}

/**
 * Machine-readable error codes. The client maps these to friendly copy; raw
 * server messages are never rendered to users.
 */
export const API_ERROR_CODES = [
  'BAD_REQUEST',
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'INVALID_CREDENTIALS',
  'TOKEN_EXPIRED',
  'TOKEN_INVALID',
  'TOKEN_REUSED',
  'CSRF_FAILED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'DUPLICATE_REVIEW',
  'EMAIL_IN_USE',
  'PAYLOAD_TOO_LARGE',
  'UNSUPPORTED_MEDIA_TYPE',
  'RATE_LIMITED',
  'FEATURE_DISABLED',
  'INTERNAL_ERROR',
  'SERVICE_UNAVAILABLE',
  'NETWORK_ERROR',
] as const;
export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

/** Field-level validation detail, keyed by dotted form path (`ingredients.0.amount`). */
export interface FieldError {
  path: string;
  message: string;
}

export interface ApiFailure {
  success: false;
  error: {
    code: ApiErrorCode;
    /** Developer-facing summary. Safe to log, never rendered verbatim to users. */
    message: string;
    fields?: FieldError[];
    /** Correlates a user-visible failure with a server log line. */
    requestId?: string;
  };
}

export type ApiResponse<TData> = ApiSuccess<TData> | ApiFailure;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export interface Paginated<TItem> {
  items: TItem[];
  pagination: PaginationMeta;
}

/** ISO-8601 timestamp string. Dates cross the wire as strings, never as `Date`. */
export type IsoDateString = string;

/** Stringified Mongo ObjectId. The client never constructs one. */
export type Id = string;

export interface Timestamped {
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}
