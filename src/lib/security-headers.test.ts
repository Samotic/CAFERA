import { describe, expect, it } from 'vitest';
import {
  buildCsp,
  isPrivateRoute,
  PRIVATE_CACHE_CONTROL,
  PRIVATE_ROUTE_PREFIXES,
  PUBLIC_CACHE_CONTROL,
  SHARED_CACHE_DIRECTIVES,
} from './security-headers';
import { THEME_SCRIPT, themeScriptHash } from './theme-script';

/**
 * The cache guard, inverted for v2.
 *
 * Under the nonce CSP the rule was one-directional: no document may be
 * shared-cached. Under a hash CSP there are two classes with opposite
 * requirements, and **both** directions have to be guarded — a public page that
 * gains `no-store` silently disables the CDN and costs every visitor a full
 * origin render, which is as invisible as a private page leaking into a shared
 * cache is dangerous.
 */

const PUBLIC_ROUTES = ['/', '/discover', '/recipes/cappuccino', '/recipes/cold-brew'];
const PRIVATE_ROUTES = [
  '/profile',
  '/profile/account',
  '/favorites',
  '/my-cafe',
  '/my-cafe/custom/new',
  '/welcome',
  '/login',
  '/register',
  '/reset-password/abc123',
];

describe('route classification', () => {
  it.each(PUBLIC_ROUTES)('treats %s as public', (route) => {
    expect(isPrivateRoute(route)).toBe(false);
  });

  it.each(PRIVATE_ROUTES)('treats %s as private', (route) => {
    expect(isPrivateRoute(route)).toBe(true);
  });

  it('covers sub-routes by prefix, so a new one is private by inheritance', () => {
    // The dangerous case is the route nobody remembers to list.
    expect(isPrivateRoute('/profile/some/future/page')).toBe(true);
    expect(isPrivateRoute('/my-cafe/custom/42/edit')).toBe(true);
  });

  it('does not treat a public route that merely starts with similar text as private', () => {
    // `/profiles` is not `/profile`.
    expect(isPrivateRoute('/profiles-of-baristas')).toBe(false);
    expect(isPrivateRoute('/favorites-guide')).toBe(false);
  });
});

describe('public documents must stay shared-cacheable', () => {
  it('does not carry no-store', () => {
    const value = PUBLIC_CACHE_CONTROL.toLowerCase();

    /* `no-store` on a public page disables the CDN entirely. Nothing breaks and
       nothing is logged — every visitor simply pays a full origin render, which
       is exactly the cost static rendering exists to avoid. */
    expect(
      value.includes('no-store'),
      'Public HTML must not carry no-store — it silently disables the CDN. ' +
        'Read the decision record at the top of security-headers.ts.',
    ).toBe(false);
    expect(value).not.toContain('private');
  });

  it('is actually shared-cacheable rather than merely not forbidden', () => {
    const value = PUBLIC_CACHE_CONTROL.toLowerCase();
    const allowsSharedCache = SHARED_CACHE_DIRECTIVES.some((directive) =>
      value.includes(directive),
    );
    expect(allowsSharedCache).toBe(true);
    expect(value).toContain('s-maxage');
  });
});

describe('private documents must never be shared-cached', () => {
  it('carries private and no-store', () => {
    const value = PRIVATE_CACHE_CONTROL.toLowerCase();
    expect(value).toContain('private');
    expect(value).toContain('no-store');
  });

  it('carries no directive that would let a shared cache store it', () => {
    const value = PRIVATE_CACHE_CONTROL.toLowerCase();

    for (const directive of SHARED_CACHE_DIRECTIVES) {
      expect(
        value.includes(directive),
        `A session-rendered document must not be shared-cacheable, but Cache-Control contained "${directive}". ` +
          "A shared cache holding one would serve one person's favourites to the next visitor.",
      ).toBe(false);
    }
  });

  it('lists every session-rendered area', () => {
    // Auth pages included: they render from a session state too.
    for (const prefix of ['/profile', '/favorites', '/my-cafe', '/welcome', '/login']) {
      expect(PRIVATE_ROUTE_PREFIXES).toContain(prefix);
    }
  });
});

describe('the policy is hash-based, with no nonce anywhere', () => {
  const production = buildCsp({ isDev: false, isSecure: true });

  it('carries no nonce directive', () => {
    /* A nonce would reintroduce per-request HTML and make every assertion above
       about public caching unachievable. */
    expect(production).not.toMatch(/'nonce-/);
  });

  it('keeps the theme-script hash available but OUT of the policy', () => {
    const hash = themeScriptHash();

    expect(hash).toMatch(/^'sha256-[A-Za-z0-9+/]+=*'$/);

    /* A browser ignores 'unsafe-inline' entirely if a hash is also present in
       the same directive. Listing the hash here does not add defence in depth —
       it silently reactivates the hash-only policy that blocks every Next.js
       flight script, and the page renders as a bare "Loading". Observed, not
       theorised. */
    expect(production).not.toContain(hash);

    // If the rendered script and the hashed constant ever diverge, the browser
    // blocks it and every dark-mode visitor gets a flash of cream.
    expect(THEME_SCRIPT).toContain('data-theme');
    expect(THEME_SCRIPT.startsWith('(function')).toBe(true);
  });

  it('forbids eval in production, and documents the inline trade', () => {
    const scriptSrc = production.split(';').find((part) => part.trim().startsWith('script-src'));

    // eval is never permitted in production.
    expect(scriptSrc).not.toContain("'unsafe-eval'");

    /* 'unsafe-inline' IS present, and that is measured rather than careless: a
       hash-only policy was tested in a real browser and blocks every Next.js
       chunk and flight script. See the decision record in security-headers.ts.
       This assertion exists so the trade is visible in the test output rather
       than discovered by someone reading the header months later. */
    expect(scriptSrc).toContain("'unsafe-inline'");

    /* strict-dynamic must NOT be present: it disables host-based allow-listing,
       which is what stops 'self' from permitting /_next/static chunks. */
    expect(scriptSrc).not.toContain("'strict-dynamic'");
  });

  it('locks down clickjacking and base-tag injection', () => {
    expect(production).toContain("frame-ancestors 'none'");
    expect(production).toContain("object-src 'none'");
    expect(production).toContain("base-uri 'none'");
    expect(production).toContain("form-action 'self'");
  });

  it('upgrades insecure requests only on a genuinely secure origin', () => {
    /* On plain HTTP the directive rewrites every subresource to https://, there
       is no TLS listener to reach, and the page renders completely unstyled.
       Chromium and Firefox mask this by exempting loopback; WebKit does not. */
    expect(buildCsp({ isDev: false, isSecure: true })).toContain('upgrade-insecure-requests');
    expect(buildCsp({ isDev: false, isSecure: false })).not.toContain('upgrade-insecure-requests');
  });
});
