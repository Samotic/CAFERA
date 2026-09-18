import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';
import { env, isTest } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * Rate limiting.
 *
 * Two tiers. The general limiter protects the API from being hammered. The auth
 * limiter is far stricter and keys on IP *and* email together, because the
 * attack it exists to stop — credential stuffing — spreads attempts across many
 * accounts from one address, or across many addresses against one account.
 * Keying on IP alone misses the second case entirely.
 *
 * Disabled under test: a suite that exercises the login endpoint thirty times
 * would otherwise start failing on the eleventh for reasons unrelated to what it
 * is testing.
 */

function rejectWithApiError(): never {
  throw ApiError.rateLimited('Too many requests. Please wait a moment and try again.');
}

const shared = {
  standardHeaders: 'draft-7' as const,
  legacyHeaders: false,
  skip: () => isTest,
  handler: () => rejectWithApiError(),
};

export const generalLimiter = rateLimit({
  ...shared,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.RATE_LIMIT_MAX,
});

/**
 * `ipKeyGenerator` normalises IPv6 to a /64 prefix. Using the raw address would
 * be useless against an attacker with an IPv6 allocation, who can present a
 * fresh address for every single request.
 */
function authKey(req: Request): string {
  const ipKey = ipKeyGenerator(req.ip ?? '');
  const body = req.body as { email?: unknown } | undefined;
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  return email ? `${ipKey}:${email}` : ipKey;
}

export const authLimiter = rateLimit({
  ...shared,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  limit: env.AUTH_RATE_LIMIT_MAX,
  keyGenerator: authKey,
});

/** Password reset is the most abusable unauthenticated endpoint — it sends mail. */
export const passwordResetLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 60 * 1000,
  limit: 5,
  keyGenerator: authKey,
});

/** Writes are cheap for a client and expensive for a database. */
export const writeLimiter = rateLimit({
  ...shared,
  windowMs: 60 * 1000,
  limit: 30,
});
