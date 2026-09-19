import { describe, expect, it } from 'vitest';
import { envSchema, mongoUriSchema } from './env.schema';

/**
 * The bug this file exists to keep dead.
 *
 * An unset variable in a `.env` file is an **empty string**, not `undefined`.
 * `??` only falls through on nullish values, so `''` sails past it as though it
 * were configuration. That is not theoretical: it made the API rewrite
 * destination resolve to `/api/:path*` — pointing at itself — and every API call
 * 404'd against the Next app with nothing logged anywhere.
 *
 * These exercise the real schema, imported from `env.schema.ts`. `env.ts` parses
 * at import time by design, so importing *that* would run the check against
 * whatever `.env.local` this machine happens to have — a test whose result
 * depends on the developer running it.
 */

describe('the empty-string trap', () => {
  it('shows why ?? is not enough', () => {
    const unset = '';

    // The bug, demonstrated rather than described.
    expect(unset ?? 'fallback').toBe('');
    expect(unset || 'fallback').toBe('fallback');
  });

  it('rejects an empty required variable instead of passing it through', () => {
    const result = envSchema.safeParse({ MONGODB_URI: '' });

    expect(result.success).toBe(false);
    // The message names the variable rather than surfacing it three layers later.
    expect(JSON.stringify(result.error?.issues)).toContain('MONGODB_URI is required');
  });

  it('rejects a whitespace-only variable', () => {
    // A trailing space after `=` in a .env file is easy to miss by eye.
    expect(mongoUriSchema.safeParse('   ').success).toBe(false);
  });
});

describe('MONGODB_URI', () => {
  it('rejects a half-pasted connection string that .url() would accept', () => {
    /* `mongodb+srv://` is a syntactically valid URL — a scheme with no host —
       so `.url()` alone passes it and the failure surfaces at connect time. */
    expect(mongoUriSchema.safeParse('mongodb+srv://').success).toBe(false);
    expect(mongoUriSchema.safeParse('mongodb://').success).toBe(false);
  });

  it('accepts real connection strings', () => {
    expect(mongoUriSchema.safeParse('mongodb://127.0.0.1:27017/cafera').success).toBe(true);
    expect(
      mongoUriSchema.safeParse('mongodb+srv://user:pw@cluster0.example.net/cafera').success,
    ).toBe(true);
  });

  it('rejects a URL that is valid but is not Mongo', () => {
    expect(mongoUriSchema.safeParse('https://example.com').success).toBe(false);
  });
});

describe('auth secret length floor', () => {
  const base = { MONGODB_URI: 'mongodb://127.0.0.1:27017/cafera' };

  it('is enforced before the feature lands, not after', () => {
    /* A short signing secret does not fail loudly — it silently weakens every
       session it signs. The moment to catch that is the first time the variable
       is set, not after real sessions exist. */
    expect(envSchema.safeParse({ ...base, BETTER_AUTH_SECRET: 'too-short' }).success).toBe(false);
    expect(envSchema.safeParse({ ...base, BETTER_AUTH_SECRET: 'a'.repeat(32) }).success).toBe(true);
  });

  it('stays optional until Phase 3', () => {
    expect(envSchema.safeParse(base).success).toBe(true);
  });
});

describe('defaults', () => {
  it('supplies a site origin rather than leaving canonicals empty', () => {
    const parsed = envSchema.parse({ MONGODB_URI: 'mongodb://127.0.0.1:27017/cafera' });
    expect(parsed.NEXT_PUBLIC_SITE_URL).toBe('http://localhost:3000');
    expect(parsed.NODE_ENV).toBe('development');
  });
});
