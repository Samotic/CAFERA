import type { RequestHandler } from 'express';

/**
 * NoSQL injection defence at the request boundary.
 *
 * MongoDB query operators are ordinary object keys beginning with `$`, and a
 * dotted key can reach into a nested path. A JSON body of
 * `{ "email": { "$gt": "" } }` posted to a login endpoint becomes a query that
 * matches the first user in the collection unless something strips it first.
 *
 * `express-mongo-sanitize` is the usual answer, but it mutates `req.query`,
 * which Express 5 exposes as a getter — so it throws on assignment. This walks
 * the parsed values instead and removes the dangerous keys in place.
 *
 * This is one of two layers. The other is `sanitizeFilter` on the Mongoose
 * connection, which rejects operators that reach a query by any other route.
 */

const MAX_DEPTH = 8;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDangerousKey(key: string): boolean {
  return key.startsWith('$') || key.includes('.');
}

/**
 * Strips dangerous keys in place and reports how many were removed. Returning a
 * count rather than silently cleaning means the caller can log the attempt —
 * a request carrying `$where` is worth knowing about.
 */
function scrub(value: unknown, depth = 0): number {
  if (depth > MAX_DEPTH) return 0;

  if (Array.isArray(value)) {
    return value.reduce<number>((removed, item) => removed + scrub(item, depth + 1), 0);
  }

  if (!isPlainObject(value)) return 0;

  let removed = 0;
  for (const key of Object.keys(value)) {
    if (isDangerousKey(key)) {
      delete value[key];
      removed += 1;
    } else {
      removed += scrub(value[key], depth + 1);
    }
  }
  return removed;
}

export const sanitizeRequest: RequestHandler = (req, _res, next) => {
  let removed = 0;

  if (req.body !== undefined) removed += scrub(req.body);
  if (req.params !== undefined) removed += scrub(req.params);
  /* `req.query` is read-only in Express 5, but the object it returns is not
     frozen — mutating its contents is both allowed and sufficient. */
  if (req.query !== undefined) removed += scrub(req.query);

  if (removed > 0) {
    // Surfaced by the request logger; the payload itself is never logged.
    Object.defineProperty(req, 'sanitizedKeyCount', { value: removed, enumerable: false });
  }

  next();
};
