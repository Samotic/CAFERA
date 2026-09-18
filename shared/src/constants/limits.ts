/**
 * Shared limits. The client uses them to keep users inside the rails; the server
 * re-enforces every one of them, because the client is never trusted.
 */

export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const NAME_MIN_LENGTH = 2;
export const NAME_MAX_LENGTH = 60;
export const EMAIL_MAX_LENGTH = 254;

export const REVIEW_BODY_MAX_LENGTH = 1000;
export const REVIEW_MIN_RATING = 1;
export const REVIEW_MAX_RATING = 5;

export const RECIPE_NAME_MAX_LENGTH = 80;
export const RECIPE_DESCRIPTION_MAX_LENGTH = 400;
export const RECIPE_MAX_INGREDIENTS = 30;
export const RECIPE_MAX_STEPS = 30;
export const STEP_INSTRUCTION_MAX_LENGTH = 500;

export const SEARCH_QUERY_MAX_LENGTH = 80;
export const RECENT_SEARCHES_LIMIT = 8;

export const DEFAULT_PAGE_SIZE = 24;
export const MAX_PAGE_SIZE = 60;
export const REVIEWS_PAGE_SIZE = 10;

/** Recently-viewed history is capped server-side so the collection stays bounded. */
export const RECENTLY_VIEWED_LIMIT = 50;

export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 6;

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const RECIPE_IMAGE_MAX_BYTES = 8 * 1024 * 1024;
export const ALLOWED_IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/avif',
] as const;
export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];

/** Access tokens are short-lived because they live in memory and travel in headers. */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
/** Refresh tokens live in an httpOnly cookie and are rotated on every use. */
export const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

/** Name of the httpOnly refresh cookie. Shared so middleware and API agree. */
export const REFRESH_COOKIE_NAME = 'cafera_rt';
/** Readable double-submit CSRF cookie; its value is echoed in a request header. */
export const CSRF_COOKIE_NAME = 'cafera_csrf';
export const CSRF_HEADER_NAME = 'x-csrf-token';
