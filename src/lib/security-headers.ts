/**
 * ============================================================================
 * DECISION RECORD — read before changing the CSP or any Cache-Control here
 * ============================================================================
 *
 * CAFERA serves a **static** Content Security Policy. It previously served a
 * nonce-based one, and dropping the nonce is the single change that makes
 * static recipe pages possible.
 *
 * WHY THE CHANGE
 *
 * A nonce must be unique per response, so nonce-bearing HTML must be generated
 * per request, so it can never be shared-cached. That is correct, and it is also
 * exactly the thing static rendering exists to enable. Removing it lets the HTML
 * become a build artefact the CDN can hold.
 *
 * The intended replacement was a hash-based policy. That turned out not to work
 * with the App Router — see the script-src section below, which records what was
 * measured and what the policy settled on instead.
 *
 * ⚠ IF NONCE CSP IS EVER REINTRODUCED:
 *
 *   nonce-bearing HTML must never carry `s-maxage`, `public` or
 *   `stale-while-revalidate`. A CDN-cached nonce served to thousands of
 *   visitors is worth roughly `unsafe-inline`.
 *
 * That warning is preserved verbatim because the reasoning behind it does not
 * expire — it is what anyone reintroducing a nonce would need to know, and it is
 * the kind of mistake that produces no error and no visible symptom.
 *
 * ---------------------------------------------------------------------------
 * script-src: WHY IT CARRIES `unsafe-inline`, AND WHAT THAT COSTS
 * ---------------------------------------------------------------------------
 * A hash-only `script-src` was implemented first and **measured in a real
 * browser**. It does not work with the Next.js App Router, for two independent
 * reasons:
 *
 *   1. `'strict-dynamic'` disables host-based allow-listing, so `'self'` stops
 *      permitting `/_next/static/chunks/*.js`. Under a nonce, trust propagates
 *      from the nonced bootstrap script to the chunks it loads. A hash on an
 *      unrelated script — ours — propagates nothing, and every chunk is blocked.
 *
 *   2. Next emits inline flight scripts (`self.__next_f.push([...])`) whose
 *      content differs per page and per build. Four distinct hashes were
 *      demanded on the home page alone. They cannot be enumerated at config
 *      time, which is the only time a static header can be built.
 *
 * So the three available policies are:
 *
 *   nonce + per-request HTML  strong script integrity, no static caching
 *   hash only                 does not run the application at all
 *   'self' + 'unsafe-inline'  static caching, no inline-script integrity
 *
 * The third is in force, because v2 requires static recipe pages. The honest
 * cost: an injected inline `<script>` would execute. What still holds is
 * everything else — no `unsafe-eval`, `object-src 'none'`, `base-uri 'none'`,
 * `frame-ancestors 'none'`, a `connect-src` that names only this origin, and
 * React escaping every interpolated value (no `dangerouslySetInnerHTML` touches
 * user input anywhere in this codebase).
 *
 * If inline-script integrity is judged to matter more than CDN caching, the
 * migration is back to a nonce — and the warning above applies in full.
 *
 * THE CACHE SPLIT THIS FILE ENFORCES
 *
 * Two classes of document, opposite requirements:
 *
 *   PUBLIC  (/, /discover, /recipes/*)  — identical for every visitor.
 *     Must be shared-cacheable. Must NOT carry `no-store`; doing so silently
 *     disables the CDN and every visitor pays a full origin render.
 *
 *   PRIVATE (/profile, /favorites, /my-cafe, /welcome, auth pages) — rendered
 *     from someone's session. Must carry `private, no-store`. A shared cache
 *     holding one of these serves one person's favourites to the next visitor.
 *
 * Both directions are guarded by tests in `security-headers.test.ts`.
 * ============================================================================
 */

/** Cache directives that let a *shared* cache store a response. */
export const SHARED_CACHE_DIRECTIVES = [
  's-maxage',
  'public',
  'stale-while-revalidate',
  'proxy-revalidate',
] as const;

/**
 * Route prefixes whose HTML is rendered from a session.
 *
 * Matched as prefixes, so `/profile/account` is covered by `/profile`. A route
 * added under one of these is private by inheritance rather than by someone
 * remembering to list it.
 */
export const PRIVATE_ROUTE_PREFIXES = [
  '/profile',
  '/favorites',
  '/my-cafe',
  '/welcome',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
] as const;

/** The only Cache-Control a session-rendered document may carry. */
export const PRIVATE_CACHE_CONTROL = 'private, no-store, must-revalidate';

/**
 * Public HTML. Short browser TTL, long shared TTL, and a stale window so a
 * revalidation never makes a visitor wait.
 */
export const PUBLIC_CACHE_CONTROL =
  'public, max-age=0, s-maxage=3600, stale-while-revalidate=86400';

export function isPrivateRoute(pathname: string): boolean {
  return PRIVATE_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Builds the policy.
 *
 * Note the absence of `'strict-dynamic'`. It is the right companion to a nonce,
 * but on its own it *disables* host-based allow-listing — which is precisely
 * what stops `'self'` from permitting `/_next/static/chunks/*.js`. Adding it
 * here would block every chunk the app loads.
 *
 * `style-src` keeps `unsafe-inline` deliberately. next/font emits an inline
 * `<style>` and React writes inline `style` attributes (the rating bar's width
 * is one). Neither is script execution — the prohibition is about executing
 * injected code, which `script-src` governs.
 */
export function buildCsp({ isDev, isSecure }: { isDev: boolean; isSecure: boolean }): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    /**
     * MEASURED, NOT ASSUMED — see the "script-src" section of the decision
     * record above.
     *
     * No hash appears here, and that is deliberate rather than an omission:
     * **a browser ignores `'unsafe-inline'` entirely if a hash or nonce is also
     * present in the same directive.** Listing the theme-script hash alongside
     * it does not add defence in depth — it silently reactivates the hash-only
     * policy that blocks every Next.js flight script, and the page renders as
     * a bare "Loading". That was observed, not theorised.
     *
     * `themeScriptHash()` is still exported. It is the value a future nonce or
     * Trusted Types migration starts from; it just cannot go in this list.
     */
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      /* The dev server compiles and evaluates modules in the browser. Never
         present in a production policy. */
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'style-src-attr': ["'unsafe-inline'"],
    /* Curated recipe photography is currently served from Unsplash. Keep the
       host explicit; arbitrary remote image origins remain blocked. */
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https://*.public.blob.vercel-storage.com',
      'https://images.unsplash.com',
      'https://res.cloudinary.com',
    ],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", ...(isDev ? ['ws:', 'wss:'] : [])],
    'media-src': ["'self'"],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    /* Clickjacking defence. `frame-ancestors` is the modern control;
       X-Frame-Options covers browsers that predate it. */
    'frame-ancestors': ["'none'"],
    'frame-src': ["'none'"],
    'object-src': ["'none'"],
    'base-uri': ["'none'"],
    'form-action': ["'self'"],
  };

  const serialised = Object.entries(directives)
    .map(([directive, values]) => `${directive} ${values.join(' ')}`)
    .join('; ');

  /**
   * `upgrade-insecure-requests` only on a genuinely secure origin.
   *
   * On plain HTTP it rewrites every subresource URL to `https://`, there is no
   * TLS listener to reach, and the page renders completely unstyled. Chromium
   * and Firefox mask this by exempting loopback; **WebKit does not**, which is
   * how it was found.
   */
  return isSecure ? `${serialised}; upgrade-insecure-requests` : serialised;
}

/** Headers every response carries, regardless of route. */
export const BASE_SECURITY_HEADERS = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
] as const;
