import { describe, expect, it } from 'vitest';
import type { NextRequest } from 'next/server';
import { config, CSP_TEST_EXPORTS, isDocumentRequest, proxy } from './proxy';

/**
 * The guard described in the decision record at the top of `proxy.ts`.
 *
 * The failure this exists to catch is silent: someone adds `s-maxage` to a
 * document response to shave TTFB, the CDN caches the nonce along with the HTML,
 * and one nonce is served to every visitor. Nothing errors, the CSP header still
 * looks correct, and the policy is worth nothing. A human reviewer would have to
 * know the interaction to spot it; this test does not.
 */

const { SHARED_CACHE_DIRECTIVES, buildCsp, createNonce } = CSP_TEST_EXPORTS;

function makeRequest(
  url = 'https://cafera.app/recipes/cappuccino',
  headers: Record<string, string> = { 'sec-fetch-dest': 'document' },
): NextRequest {
  return {
    nextUrl: new URL(url),
    headers: new Headers(headers),
  } as unknown as NextRequest;
}

describe('nonce and shared caching are mutually exclusive', () => {
  it('never lets a nonce-bearing document carry a shared-cache directive', () => {
    const response = proxy(makeRequest());

    const csp = response.headers.get('content-security-policy') ?? '';
    const cacheControl = (response.headers.get('cache-control') ?? '').toLowerCase();

    // Precondition: this response really does carry a nonce.
    expect(csp).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);

    // The assertion that matters.
    for (const directive of SHARED_CACHE_DIRECTIVES) {
      expect(
        cacheControl.includes(directive),
        `A nonce-bearing document response must not be shared-cacheable, but Cache-Control contained "${directive}". ` +
          'Read the decision record at the top of proxy.ts before changing this.',
      ).toBe(false);
    }

    expect(cacheControl).toContain('private');
    expect(cacheControl).toContain('no-store');
  });

  it('marks every document response, not just some routes', () => {
    // The dangerous case is the route that forgets, so the header is applied
    // unconditionally rather than being opted into.
    for (const path of ['/', '/discover', '/recipes/cappuccino', '/favorites', '/profile']) {
      const response = proxy(makeRequest(`https://cafera.app${path}`));
      expect(response.headers.get('cache-control')).toContain('no-store');
      expect(response.headers.get('content-security-policy')).toContain("'nonce-");
    }
  });

  it('issues a distinct nonce per response', () => {
    const first = proxy(makeRequest()).headers.get('content-security-policy') ?? '';
    const second = proxy(makeRequest()).headers.get('content-security-policy') ?? '';

    const nonceOf = (csp: string) => csp.match(/'nonce-([A-Za-z0-9+/=]+)'/)?.[1];

    expect(nonceOf(first)).toBeTruthy();
    expect(nonceOf(first)).not.toBe(nonceOf(second));
  });

  it('excludes static assets by matcher, so they stay aggressively cacheable', () => {
    // Assets are kept out by `config.matcher` rather than by a runtime check —
    // the proxy never executes for them, so nothing here can make an image
    // uncacheable.
    const [pattern] = config.matcher;
    // Next anchors matcher patterns against the full pathname; an unanchored
    // RegExp would happily match at a later offset and report the opposite.
    const matcher = new RegExp(`^${pattern}$`);

    expect(matcher.test('/images/coffee/espresso.avif')).toBe(false);
    expect(matcher.test('/_next/static/chunks/main.js')).toBe(false);
    expect(matcher.test('/favicon.ico')).toBe(false);
    expect(matcher.test('/manifest.webmanifest')).toBe(false);

    // …while real pages are still covered.
    expect(matcher.test('/')).toBe(true);
    expect(matcher.test('/recipes/cappuccino')).toBe(true);
  });

  it('treats an RSC payload request as data, not a document', () => {
    expect(isDocumentRequest(makeRequest('https://cafera.app/discover?_rsc=abc123'))).toBe(false);
    expect(isDocumentRequest(makeRequest('https://cafera.app/discover', { rsc: '1' }))).toBe(false);
    expect(isDocumentRequest(makeRequest('https://cafera.app/discover'))).toBe(true);
  });

  it('fails closed when the client does not say what it is fetching', () => {
    /* curl, older browsers and crawlers send no Sec-Fetch-Dest. Treating that as
       "not a document" would let any client opt out of the CSP simply by saying
       less, which is how the header went missing in production the first time. */
    const response = proxy(makeRequest('https://cafera.app/', {}));

    expect(response.headers.get('content-security-policy')).toContain("'nonce-");
    expect(response.headers.get('cache-control')).toContain('no-store');
  });

  it('still excludes a positively identified non-document fetch', () => {
    expect(
      isDocumentRequest(makeRequest('https://cafera.app/', { 'sec-fetch-dest': 'image' })),
    ).toBe(false);
    expect(
      isDocumentRequest(makeRequest('https://cafera.app/', { 'sec-fetch-dest': 'script' })),
    ).toBe(false);
  });
});

describe('policy contents', () => {
  const nonce = createNonce();

  it('forbids inline script in production', () => {
    const csp = buildCsp(nonce, false, 'https://api.cafera.app');
    const scriptSrc = csp.split(';').find((part) => part.trim().startsWith('script-src')) ?? '';

    expect(scriptSrc).not.toContain("'unsafe-inline'");
    expect(scriptSrc).not.toContain("'unsafe-eval'");
    expect(scriptSrc).toContain(`'nonce-${nonce}'`);
    expect(scriptSrc).toContain("'strict-dynamic'");
  });

  it('allows unsafe-eval only in development, where the dev server needs it', () => {
    expect(buildCsp(nonce, true, null)).toContain("'unsafe-eval'");
    expect(buildCsp(nonce, false, null)).not.toContain("'unsafe-eval'");
  });

  it('locks down the directives that enable clickjacking and base-tag injection', () => {
    const csp = buildCsp(nonce, false, null);

    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain("form-action 'self'");
  });

  it('allows the API origin to be contacted and nothing else', () => {
    const csp = buildCsp(nonce, false, 'https://api.cafera.app');
    const connectSrc = csp.split(';').find((part) => part.trim().startsWith('connect-src')) ?? '';

    expect(connectSrc).toContain('https://api.cafera.app');
    expect(connectSrc).not.toContain('*');
  });

  it('upgrades insecure requests in production only', () => {
    expect(buildCsp(nonce, false, null)).toContain('upgrade-insecure-requests');
    expect(buildCsp(nonce, true, null)).not.toContain('upgrade-insecure-requests');
  });

  it('permits Cloudinary images but not arbitrary remote hosts', () => {
    const csp = buildCsp(nonce, false, null);
    const imgSrc = csp.split(';').find((part) => part.trim().startsWith('img-src')) ?? '';

    expect(imgSrc).toContain('https://res.cloudinary.com');
    expect(imgSrc).not.toContain('https:;');
  });
});
