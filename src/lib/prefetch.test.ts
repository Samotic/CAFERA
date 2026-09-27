import { describe, expect, it } from 'vitest';
import { hrefPathname, prefetchFor } from './prefetch';
import { PRIVATE_ROUTE_PREFIXES } from './security-headers';

describe('prefetchFor', () => {
  it.each([...PRIVATE_ROUTE_PREFIXES])('never prefetches %s', (prefix) => {
    expect(prefetchFor(prefix)).toBe(false);
  });

  it('never prefetches a nested private route', () => {
    expect(prefetchFor('/profile/account')).toBe(false);
    expect(prefetchFor('/my-cafe/custom/new')).toBe(false);
  });

  /**
   * The whole point of the helper. `prefetch={true}` is not "the default, but
   * explicit" — it forces a *full* prefetch of a dynamic route, which turned
   * /discover's prefetch into a 28 KB payload during the critical window.
   * `undefined` is Next's `auto`, which stops at the nearest loading boundary.
   */
  it('returns undefined rather than true for a public route', () => {
    expect(prefetchFor('/discover')).toBeUndefined();
    expect(prefetchFor('/discover')).not.toBe(true);
    expect(prefetchFor('/')).toBeUndefined();
    expect(prefetchFor('/recipes/cappuccino')).toBeUndefined();
  });

  it('does not treat a public path sharing a prefix as private', () => {
    expect(prefetchFor('/profiles-of-coffee')).toBeUndefined();
    expect(prefetchFor('/login-help')).toBeUndefined();
  });
});

describe('hrefPathname', () => {
  it('drops the query and the fragment', () => {
    /* A category filter is still the /discover route. */
    expect(hrefPathname('/discover?category=sweet')).toBe('/discover');
    expect(hrefPathname('/recipes/mocha#method')).toBe('/recipes/mocha');
    expect(hrefPathname('/profile?tab=saved')).toBe('/profile');
  });

  it('reads a UrlObject', () => {
    expect(hrefPathname({ pathname: '/favorites' })).toBe('/favorites');
    expect(hrefPathname({})).toBe('');
  });

  it('keeps a bare path unchanged', () => {
    expect(hrefPathname('/discover')).toBe('/discover');
  });

  it('composes with prefetchFor for a private route carrying a query', () => {
    /* The combination is what the components actually call. */
    expect(prefetchFor(hrefPathname('/profile?tab=saved'))).toBe(false);
  });
});
