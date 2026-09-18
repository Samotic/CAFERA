import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * ============================================================================
 * DECISION RECORD — read before changing anything in this file
 * ============================================================================
 *
 * CAFERA serves a nonce-based Content Security Policy with no `unsafe-inline`
 * on `script-src`. Three consequences follow from that, and they are a package:
 * you cannot keep the policy and discard any one of them.
 *
 *   1. A nonce must be unique per response. That is the entire basis of the
 *      control — it is what distinguishes the scripts we emitted from scripts an
 *      injection added.
 *
 *   2. Therefore the HTML must be generated per request. There is no literal ISR
 *      or `generateStaticParams` for recipe pages while this policy is in force.
 *      ISR's *intent* is preserved one layer down instead: recipe reads are
 *      cached and tag-invalidated, so the database is not touched per request.
 *
 *   3. Therefore nonce-bearing HTML MUST NEVER BE SHARED-CACHED. This is the
 *      failure mode that matters, because it is silent. If anyone adds
 *      `s-maxage`, `public` or `stale-while-revalidate` to a document response —
 *      the obvious optimisation once someone notices the TTFB cost — the CDN
 *      caches the nonce along with the HTML and serves one nonce to thousands of
 *      visitors. Nothing breaks. The header still looks correct. An attacker who
 *      can read a single page now holds a valid nonce for everyone else's page,
 *      which is worth approximately `unsafe-inline`.
 *
 * If static HTML is wanted later, the correct trade is a HASH-BASED CSP for the
 * known inline scripts — not caching the nonce. Do not reach for the cache.
 *
 * `proxy.ts` is Next 16's replacement for `middleware.ts`; the exported function
 * must be named `proxy`, and it runs on the Node runtime.
 *
 * A test in `src/proxy.test.ts` fails if a nonce-bearing response ever gains a
 * shared-cache directive. That test is the guard that survives a refactor.
 * ============================================================================
 */

/** Cache directives that permit a *shared* cache to store the response. */
const SHARED_CACHE_DIRECTIVES = [
  's-maxage',
  'public',
  'stale-while-revalidate',
  'proxy-revalidate',
];

/**
 * The only Cache-Control a nonce-bearing document may carry. `private` bars
 * shared caches outright; `no-store` bars the browser cache too, which also
 * keeps authenticated HTML out of a shared machine's disk cache.
 */
const DOCUMENT_CACHE_CONTROL = 'private, no-store, must-revalidate';

function createNonce(): string {
  return randomBytes(16).toString('base64');
}

/**
 * Builds the policy.
 *
 * `strict-dynamic` is what makes a nonce workable with a bundler: it propagates
 * trust from the nonced bootstrap script to the chunks it loads, so we do not
 * have to enumerate every hashed chunk filename.
 *
 * `style-src` keeps `unsafe-inline`, deliberately. next/font emits an inline
 * `<style>`, React writes inline `style` attributes (the rating bar's width is
 * one), and neither is script execution — the §25 prohibition is about
 * executing injected code, which `script-src` governs. Modern browsers ignore
 * `unsafe-inline` on any directive that also carries a nonce, so listing both is
 * a graceful degradation for old browsers rather than a weakening of the policy.
 */
function buildCsp(
  nonce: string,
  isDev: boolean,
  apiOrigin: string | null,
  isSecure: boolean,
): string {
  const directives: Record<string, string[]> = {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      /* Next's dev server compiles and evaluates modules in the browser. This is
         never present in a production policy. */
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    'style-src': ["'self'", "'unsafe-inline'"],
    'style-src-attr': ["'unsafe-inline'"],
    'img-src': ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com'],
    'font-src': ["'self'", 'data:'],
    'connect-src': ["'self'", ...(apiOrigin ? [apiOrigin] : []), ...(isDev ? ['ws:', 'wss:'] : [])],
    'media-src': ["'self'"],
    'worker-src': ["'self'", 'blob:'],
    'manifest-src': ["'self'"],
    /* Clickjacking defence. `frame-ancestors` is the modern control;
       X-Frame-Options in next.config.ts covers browsers that predate it. */
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
   * `upgrade-insecure-requests` is emitted only on a genuinely secure origin.
   *
   * It rewrites every http:// subresource URL to https://, which is exactly
   * right in production and catastrophic on a plain-HTTP origin: there is no
   * TLS listener to upgrade *to*, so every stylesheet, script and font fails
   * with an SSL error and the page renders completely unstyled.
   *
   * Chromium and Firefox hide this by exempting loopback addresses. **WebKit
   * does not**, so gating on NODE_ENV alone made the production build
   * untestable in Safari — found by the cross-browser suite, invisible in the
   * other two engines.
   */
  return isSecure ? `${serialised}; upgrade-insecure-requests` : serialised;
}

/**
 * True for requests that will produce an HTML document.
 *
 * This deliberately FAILS CLOSED. `Sec-Fetch-Dest` is the reliable signal, but
 * it is not universal — curl, older browsers and various crawlers send nothing
 * useful. An earlier version treated "cannot tell" as "not a document", which
 * meant any client that omitted the header received no CSP at all: a security
 * header that a request can opt out of by saying less is not a security header.
 *
 * So the only requests excluded are the ones positively identified as *not*
 * documents — RSC payloads, and fetches whose destination is explicitly
 * something else. Everything ambiguous gets the policy, which costs an unused
 * header on a handful of non-HTML responses and closes the hole.
 */
export function isDocumentRequest(request: NextRequest): boolean {
  // React Server Component payloads are data: no inline script, nothing to nonce.
  if (request.nextUrl.searchParams.has('_rsc')) return false;
  if (request.headers.has('rsc')) return false;

  const dest = request.headers.get('sec-fetch-dest');
  if (dest) return dest === 'document' || dest === 'empty';

  return true;
}

export function proxy(request: NextRequest): NextResponse {
  const isDev = process.env.NODE_ENV !== 'production';
  const apiOrigin = process.env.NEXT_PUBLIC_API_URL ?? null;

  /* Behind a load balancer the connection to this process is plain HTTP even
     though the browser's connection is HTTPS, so the forwarded header is the
     authority when it is present. */
  const forwardedProto = request.headers.get('x-forwarded-proto');
  const isSecure = forwardedProto
    ? forwardedProto.split(',')[0]?.trim() === 'https'
    : request.nextUrl.protocol === 'https:';

  if (!isDocumentRequest(request)) {
    return NextResponse.next();
  }

  const nonce = createNonce();

  /* The nonce travels forward on the request so the root layout can read it via
     headers() and hand it to the theme script, and back on the response as part
     of the policy. Both halves must carry the same value or the script is
     blocked. */
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);

  const response = NextResponse.next({ request: { headers: requestHeaders } });

  response.headers.set('Content-Security-Policy', buildCsp(nonce, isDev, apiOrigin, isSecure));

  /* See consequence 3 in the decision record above. This is set unconditionally
     for documents rather than opted into per route, because the dangerous case
     is the route that forgets. */
  response.headers.set('Cache-Control', DOCUMENT_CACHE_CONTROL);
  response.headers.set('Vary', 'Sec-Fetch-Dest, Accept');

  return response;
}

export const config = {
  /**
   * Static assets, images and the favicon never need a nonce and must stay
   * aggressively cacheable — the prohibition in this file applies only to HTML
   * carrying a nonce, never to assets, JSON or images.
   */
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icons/|images/|manifest.webmanifest).*)'],
};

/** Exported for the guard test. */
export const CSP_TEST_EXPORTS = {
  SHARED_CACHE_DIRECTIVES,
  DOCUMENT_CACHE_CONTROL,
  buildCsp,
  createNonce,
};
