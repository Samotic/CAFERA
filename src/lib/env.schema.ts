import { z } from 'zod';

/**
 * The environment schema, with no side effects.
 *
 * Kept separate from `env.ts` because that module *parses at import time* — the
 * whole point, so a misconfigured deployment fails at boot rather than at the
 * first request. But that also means importing it from a test would run the
 * parse against whatever `.env.local` the developer happens to have, making the
 * test non-hermetic and its result machine-dependent.
 *
 * Splitting the schema out lets the test exercise the real rules directly,
 * rather than a copy that drifts.
 */

/**
 * `.url()` is not sufficient on its own: it accepts `mongodb+srv://`, because a
 * scheme with no host is still a syntactically valid URL. A half-pasted
 * connection string would pass validation and fail later at connect time, which
 * is the wrong place to find out. This checks for the part that matters.
 */
export const mongoUriSchema = z
  .string()
  .min(1, 'MONGODB_URI is required')
  .refine(
    (value) => /^mongodb(\+srv)?:\/\/[^/\s]+/.test(value),
    'MONGODB_URI must be a mongodb:// or mongodb+srv:// string that includes a host',
  );

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  /**
   * Atlas connection string. Pin the cluster to the same region as the Vercel
   * functions — a cross-region cluster adds 100ms+ per query, paid again for
   * every query a page issues.
   */
  MONGODB_URI: mongoUriSchema,

  /**
   * Phase 3 (Better Auth). Optional until it lands, but the length floor is
   * enforced now: a short signing secret does not fail loudly, it silently
   * weakens every session it signs, and the moment to catch that is the first
   * time the variable is set — not after real sessions exist.
   */
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, 'BETTER_AUTH_SECRET must be at least 32 characters')
    .optional(),
  BETTER_AUTH_URL: z.string().min(1).url().optional(),

  /** Vercel Blob, for user-uploaded images. Phase 4. */
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),

  /** Public site origin. Absolute URLs are required for canonicals and OG tags. */
  NEXT_PUBLIC_SITE_URL: z.string().min(1).url().default('http://localhost:3000'),
});

export type Env = z.infer<typeof envSchema>;
