import { envSchema, type Env } from './env.schema';

/**
 * Environment validation — the single place `process.env` is read.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS EXISTS AS A MODULE RATHER THAN A CONVENTION
 * ---------------------------------------------------------------------------
 * An unset variable in a `.env` file is an **empty string**, not `undefined`.
 * `??` only falls through on null and undefined, so it passes `''` straight
 * through as if it were a real value. That is not hypothetical here: it made the
 * API rewrite destination resolve to `/api/:path*` — pointing at itself — and
 * every API call 404'd against the Next app with nothing logged anywhere.
 *
 * `.min(1)` on every required string closes that off at the class level: an
 * empty variable fails at module load with the variable's name, instead of
 * travelling silently into a URL, a connection string or a signing key.
 *
 * An ESLint rule forbids `process.env` outside this file, so the pattern cannot
 * come back the next time someone needs one value in a hurry.
 *
 * The schema itself lives in `env.schema.ts` so tests can exercise the real
 * rules without triggering this parse against a developer's local `.env`.
 */

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    /* Every problem at once rather than one per restart, and names only — the
       values are the secrets. */
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');

    throw new Error(
      `Invalid environment configuration:\n${issues}\n\n` +
        'See .env.example for the full list of expected variables.',
    );
  }

  return parsed.data;
}

export const env = loadEnv();

export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
export const isDevelopment = env.NODE_ENV === 'development';

export type { Env };
