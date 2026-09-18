import type { CookieOptions, Response } from 'express';
import { CSRF_COOKIE_NAME, REFRESH_COOKIE_NAME, REFRESH_TOKEN_TTL_SECONDS } from '@cafera/shared';
import { env, isProduction } from '../config/env.js';

/**
 * Cookie policy, in one place.
 *
 * ---------------------------------------------------------------------------
 * TOPOLOGY: same-origin via the Next.js proxy (Option B)
 * ---------------------------------------------------------------------------
 * The browser only ever talks to the web origin. `/api/*` is rewritten by Next
 * to the Express service, so from the browser's point of view every request is
 * first-party and the refresh cookie is a first-party cookie.
 *
 * This was chosen over sibling subdomains because it needs no registrable domain
 * and, more importantly, because it is immune to the failure that sinks the
 * obvious third option:
 *
 *   A genuinely cross-site split — frontend on *.vercel.app, API on
 *   *.railway.app — forces `SameSite=None` on the refresh cookie. That makes it
 *   a THIRD-PARTY cookie, which Safari blocks outright via ITP and Firefox
 *   blocks under Total Cookie Protection. Login appears to succeed and the
 *   session silently fails to persist, for a large share of real users, on
 *   browsers that are not the one you develop in. That topology is never used
 *   here.
 *
 * Because everything is same-origin, `SameSite=Strict` is viable — the strictest
 * setting available, and one that would break a cross-site setup outright.
 */

/** Options shared by every cookie this service sets. */
function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    /* Must be true in production; `config/env.ts` refuses to boot otherwise. */
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAMESITE,
    ...(env.COOKIE_DOMAIN ? { domain: env.COOKIE_DOMAIN } : {}),
  };
}

/**
 * The refresh cookie.
 *
 * `httpOnly` is the whole point: JavaScript cannot read it, so an XSS that can
 * run arbitrary script still cannot exfiltrate the long-lived credential. The
 * access token is deliberately NOT stored here — it lives in memory on the
 * client and travels in an Authorization header.
 *
 * `path` narrows it to the auth routes, so it is not attached to every single
 * API request. A credential that is sent a hundred times a session has a hundred
 * chances to end up somewhere it should not.
 */
export const REFRESH_COOKIE_PATH = '/api/auth';

export function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE_NAME, token, {
    ...baseCookieOptions(),
    path: REFRESH_COOKIE_PATH,
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  });
}

export function clearRefreshCookie(res: Response): void {
  /* Attributes must match the ones the cookie was set with, or the browser
     treats it as a different cookie and the old one survives the logout. */
  res.clearCookie(REFRESH_COOKIE_NAME, {
    ...baseCookieOptions(),
    path: REFRESH_COOKIE_PATH,
  });
}

/**
 * The CSRF cookie.
 *
 * Deliberately **readable** by JavaScript — that is what makes the double-submit
 * pattern work. The client reads it and echoes it in a request header; an
 * attacker's page on another origin can cause the cookie to be *sent* but cannot
 * *read* it, so it cannot set the matching header.
 *
 * It is not a secret. It is a value only the legitimate origin can observe.
 */
export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE_NAME, token, {
    ...baseCookieOptions(),
    httpOnly: false,
    path: '/',
    maxAge: REFRESH_TOKEN_TTL_SECONDS * 1000,
  });
}

export function clearCsrfCookie(res: Response): void {
  res.clearCookie(CSRF_COOKIE_NAME, {
    ...baseCookieOptions(),
    httpOnly: false,
    path: '/',
  });
}

/** Both cookies, cleared together. Logout must never leave half a session. */
export function clearSessionCookies(res: Response): void {
  clearRefreshCookie(res);
  clearCsrfCookie(res);
}

/**
 * The exact attribute string this deployment produces, for the README and for
 * tests. Deriving it rather than re-typing it means the documentation cannot
 * drift away from the behaviour.
 */
export function describeRefreshCookie(): string {
  const parts = [
    `${REFRESH_COOKIE_NAME}=<token>`,
    'HttpOnly',
    env.COOKIE_SECURE ? 'Secure' : null,
    `SameSite=${env.COOKIE_SAMESITE === 'lax' ? 'Lax' : env.COOKIE_SAMESITE === 'strict' ? 'Strict' : 'None'}`,
    `Path=${REFRESH_COOKIE_PATH}`,
    `Max-Age=${REFRESH_TOKEN_TTL_SECONDS}`,
    env.COOKIE_DOMAIN ? `Domain=${env.COOKIE_DOMAIN}` : null,
  ].filter(Boolean);

  return parts.join('; ');
}

/** True when the current configuration would produce a third-party cookie. */
export function isThirdPartyCookieConfiguration(): boolean {
  return env.COOKIE_SAMESITE === 'none';
}

export { isProduction };
