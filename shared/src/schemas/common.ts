import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../constants/limits.js';

/**
 * Primitive schemas reused across every contract.
 *
 * These live in `shared` so the browser form, the Express handler and the test
 * suite all validate against the same rules. A divergence here is a security bug,
 * not a style issue: the server half is the only half that is actually enforced.
 */

/** 24-character hex Mongo ObjectId. Rejects the `$ne`-style objects used in NoSQL injection. */
export const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid identifier');

/** URL-safe slug: lowercase words joined by single hyphens. */
export const slugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Invalid slug');

/**
 * Query params arrive as strings, so pagination is coerced. Both bounds are
 * clamped rather than rejected — a bookmarked `?limit=5000` should degrade to the
 * maximum page size, not throw an error at someone reopening an old tab.
 */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(10_000).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});
export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

/** Checkbox-style params: `?milk=true`, `?milk=1` and `?milk` all mean the same thing. */
export const booleanParamSchema = z.union([z.boolean(), z.string()]).transform((value) => {
  if (typeof value === 'boolean') return value;
  const normalized = value.trim().toLowerCase();
  return normalized === '' || normalized === 'true' || normalized === '1' || normalized === 'on';
});

/**
 * Control-character classes.
 *
 * `\p{Cc}` is the Unicode "control" category, used here in preference to an
 * explicit codepoint range. Writing the range literally puts real control bytes —
 * NUL among them — into this source file, where they are invisible in a diff,
 * survive a copy-paste, and get noticed only when someone happens to lint the
 * file. The property escape says the same thing and stays plain text.
 *
 * The second pattern is a double negation: "in Cc, but not a newline", for text
 * that is allowed to keep its line breaks.
 */
const CONTROL_CHARS = /\p{Cc}/gu;
const CONTROL_CHARS_EXCEPT_NEWLINE = /[^\P{Cc}\n]/gu;

/**
 * Collapses whitespace and strips control characters. Applied to every free-text
 * field before it reaches the database so stored content is predictable; it is a
 * normalisation step, not an XSS defence (that is escaping at render time).
 */
export const cleanText = (value: string): string =>
  value.replace(CONTROL_CHARS, ' ').replace(/\s+/g, ' ').trim();

export const trimmedString = (min: number, max: number, label: string) =>
  z
    .string()
    .transform(cleanText)
    .pipe(
      z
        .string()
        .min(min, `${label} must be at least ${min} characters`)
        .max(max, `${label} must be at most ${max} characters`),
    );

/** Multi-line text keeps its newlines; only control characters and CR are removed. */
export const multilineString = (min: number, max: number, label: string) =>
  z
    .string()
    .transform((value) =>
      value
        .replace(/\r\n/g, '\n')
        .replace(CONTROL_CHARS_EXCEPT_NEWLINE, ' ')
        .replace(/[ \t]+/g, ' ')
        .replace(/\n{3,}/g, '\n\n')
        .trim(),
    )
    .pipe(
      z
        .string()
        .min(min, `${label} must be at least ${min} characters`)
        .max(max, `${label} must be at most ${max} characters`),
    );
