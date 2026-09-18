import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { RequestHandler } from 'express';
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from '@cafera/shared';
import { env } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';

/**
 * CSRF protection for cookie-authenticated, state-changing requests.
 *
 * This exists because the refresh token lives in a cookie, and cookies are
 * attached by the browser to requests it did not originate. A form on
 * `evil.example` posting to `/api/users/profile` would otherwise arrive with a
 * valid session attached. That is the entire attack.
 *
 * Two independent checks, either of which is sufficient on its own in most
 * browsers, and which together leave very little room:
 *
 *  1. **Origin / Sec-Fetch-Site.** The browser sets these and a page cannot
 *     forge them. A request that announces itself as cross-site is refused
 *     before anything else happens.
 *
 *  2. **Double-submit token.** A random value is set in a readable cookie and
 *     must be echoed in a request header. An attacker's page can cause the
 *     cookie to be *sent* but cannot *read* it, and cannot set a custom header
 *     on a cross-origin request without passing a CORS preflight that the
 *     allow-list refuses.
 *
 * `SameSite=Strict` on the refresh cookie is a third layer, but it is not relied
 * on alone: SameSite is a browser policy, and a defence that evaporates on an
 * older or unusual client is not a defence.
 *
 * Safe methods are exempt. GET, HEAD and OPTIONS must not change state, so there
 * is nothing for a forged one to accomplish — and requiring a token on them
 * would break every ordinary page load.
 */

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/** 32 bytes: far beyond guessing, and short enough to sit in a header. */
export function createCsrfToken(): string {
  return randomBytes(32).toString('base64url');
}

/**
 * Constant-time comparison.
 *
 * A plain `===` leaks, through timing, how many leading characters matched,
 * which over enough requests is enough to reconstruct a token. The cost of doing
 * it properly is a few microseconds.
 */
function tokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  // timingSafeEqual throws on a length mismatch, which would itself be a leak.
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Rejects a request that the browser itself reports as cross-site.
 *
 * `Sec-Fetch-Site` is the modern, unforgeable signal. `Origin` is the fallback
 * for clients that do not send it. A request with neither is allowed through to
 * the token check: server-to-server callers legitimately send no Origin, and
 * they carry no ambient cookies for an attacker to exploit.
 */
function isCrossSiteRequest(secFetchSite: string | undefined, origin: string | undefined): boolean {
  if (secFetchSite) {
    return secFetchSite === 'cross-site';
  }

  if (origin) {
    return !env.CORS_ORIGINS.includes(origin);
  }

  return false;
}

export const csrfProtection: RequestHandler = (req, _res, next) => {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const secFetchSite = req.get('sec-fetch-site') ?? undefined;
  const origin = req.get('origin') ?? undefined;

  if (isCrossSiteRequest(secFetchSite, origin)) {
    next(ApiError.forbidden('Cross-site request rejected'));
    return;
  }

  const cookies = req.cookies as Record<string, string | undefined> | undefined;
  const cookieToken = cookies?.[CSRF_COOKIE_NAME];
  const headerToken = req.get(CSRF_HEADER_NAME) ?? undefined;

  if (!cookieToken || !headerToken) {
    next(new ApiError(403, 'CSRF_FAILED', 'Missing CSRF token. Reload the page and try again.'));
    return;
  }

  if (!tokensMatch(cookieToken, headerToken)) {
    next(new ApiError(403, 'CSRF_FAILED', 'CSRF token mismatch.'));
    return;
  }

  next();
};

/** Exposed for tests. */
export const CSRF_TEST_EXPORTS = { isCrossSiteRequest, tokensMatch, SAFE_METHODS };
