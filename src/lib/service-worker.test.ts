import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { PRIVATE_ROUTE_PREFIXES } from './security-headers';

/**
 * Tests for `public/sw.js`.
 *
 * The worker is a classic script served straight from `public/`, so it cannot
 * import anything and nothing can import it. That buys a worker with no build
 * step (see the comment at the top of the file) and costs the two things this
 * suite restores:
 *
 *   1. its copy of the private-route list can drift from the real one;
 *   2. its HTML parsing — the mechanism the whole no-build-step design rests
 *      on — is otherwise never exercised until a visitor goes offline.
 *
 * Both are recovered by evaluating the source in a `vm` context with a stubbed
 * `self`. Only listener registration runs at the top level, so nothing else has
 * to be faked.
 */

const SOURCE = readFileSync(join(process.cwd(), 'public', 'sw.js'), 'utf8');
const ORIGIN = 'https://cafera.test';

interface WorkerInternals {
  isPrivatePath: (pathname: string) => boolean;
  isCacheable: (response: { ok: boolean; type?: string; headers: Headers }) => boolean;
  extractAssets: (html: string) => { statics: string[]; images: string[] };
  narrowestPerImage: (urls: string[]) => string[];
  PRIVATE_PREFIXES: string[];
  CORE_PATHS: string[];
}

function loadWorker(): WorkerInternals {
  const listeners: string[] = [];

  const context = {
    self: {
      addEventListener: (type: string) => listeners.push(type),
      location: { origin: ORIGIN },
      skipWaiting: () => {},
      clients: { claim: () => {} },
    },
    URL,
    Response,
    Headers,
    fetch: () => Promise.reject(new Error('no network in this test')),
    caches: undefined,
  };

  /* Top-level `function` and `const` declarations land in this context's scope,
     so the trailing expression can hand them back. */
  const internals = runInNewContext(
    `${SOURCE}\n;({ isPrivatePath, isCacheable, extractAssets, narrowestPerImage, PRIVATE_PREFIXES, CORE_PATHS })`,
    context,
  ) as WorkerInternals;

  /* If the worker ever stops wiring these up, everything below still passes
     while offline support does nothing at all. */
  expect(listeners).toEqual(expect.arrayContaining(['install', 'activate', 'fetch', 'message']));

  return internals;
}

const worker = loadWorker();

describe('service worker private routes', () => {
  /**
   * The security invariant this protects: a cached /favorites that survives a
   * sign-out on a shared device is the same class of leak as a CDN serving one
   * visitor's favourites to the next.
   */
  it('skips exactly the routes the headers mark private', () => {
    expect(worker.PRIVATE_PREFIXES.slice().sort()).toEqual(
      [...PRIVATE_ROUTE_PREFIXES].slice().sort(),
    );
  });

  it.each([...PRIVATE_ROUTE_PREFIXES])('treats %s and its children as private', (prefix) => {
    expect(worker.isPrivatePath(prefix)).toBe(true);
    expect(worker.isPrivatePath(`${prefix}/nested/page`)).toBe(true);
  });

  it('does not treat a public path that merely starts with the same letters as private', () => {
    /* A `startsWith` without the boundary check would make /login-help private
       and, worse, would make /profiles-of-coffee uncacheable for no reason. */
    expect(worker.isPrivatePath('/profiles-of-coffee')).toBe(false);
    expect(worker.isPrivatePath('/recipes/cappuccino')).toBe(false);
    expect(worker.isPrivatePath('/discover')).toBe(false);
  });

  it('never precaches a private path even if the sitemap lists one', () => {
    expect(worker.CORE_PATHS.some((path) => worker.isPrivatePath(path))).toBe(false);
  });
});

describe('service worker response filtering', () => {
  const response = (ok: boolean, cacheControl?: string, type = 'basic') => ({
    ok,
    type,
    headers: new Headers(cacheControl ? { 'cache-control': cacheControl } : {}),
  });

  it('keeps a public 200', () => {
    expect(worker.isCacheable(response(true, 'public, s-maxage=3600'))).toBe(true);
  });

  it.each(['private, no-store, must-revalidate', 'no-store', 'PRIVATE, max-age=0'])(
    'refuses a response marked %s regardless of its path',
    (control) => {
      expect(worker.isCacheable(response(true, control))).toBe(false);
    },
  );

  it('refuses a non-200', () => {
    expect(worker.isCacheable(response(false, 'public'))).toBe(false);
  });

  it('refuses an opaque cross-origin response', () => {
    /* An opaque response reads as status 0 with an unreadable body. Cached, it
       would satisfy every later request for that URL with nothing. */
    expect(worker.isCacheable(response(true, 'public', 'opaque'))).toBe(false);
  });
});

describe('service worker asset discovery', () => {
  /* Shaped like real App Router output: a stylesheet, a chunk, and one
     `next/image` srcset with the ampersands HTML-escaped. */
  const html = `<!DOCTYPE html><html><head>
    <link rel="stylesheet" href="/_next/static/css/4f2b1a9c.css"/>
    <script src="/_next/static/chunks/main-app-1a2b3c.js" async></script>
  </head><body>
    <img alt="Cappuccino"
      srcset="/_next/image?url=%2Fimages%2Fcoffee%2Fcappuccino.avif&amp;w=640&amp;q=75 640w, /_next/image?url=%2Fimages%2Fcoffee%2Fcappuccino.avif&amp;w=1200&amp;q=75 1200w"
      src="/_next/image?url=%2Fimages%2Fcoffee%2Fcappuccino.avif&amp;w=1920&amp;q=75"/>
    <script>self.__next_f.push([1,"a"])</script>
  </body></html>`;

  it('finds the stylesheet and the chunk', () => {
    expect(worker.extractAssets(html).statics.sort()).toEqual([
      '/_next/static/chunks/main-app-1a2b3c.js',
      '/_next/static/css/4f2b1a9c.css',
    ]);
  });

  it('unescapes &amp; in image URLs', () => {
    /* Left escaped, the cached key is a URL the browser will never request, so
       every lookup misses and offline images are simply absent. */
    const { images } = worker.extractAssets(html);
    expect(images.length).toBeGreaterThan(0);
    for (const image of images) {
      expect(image).not.toContain('&amp;');
      expect(image).toContain('&w=');
    }
  });

  it('stops each srcset candidate at its descriptor rather than swallowing the next', () => {
    const { images } = worker.extractAssets(html);
    for (const image of images) {
      expect(image).not.toContain(' ');
      expect(image).not.toContain(',');
    }
    expect(images).toContain('/_next/image?url=%2Fimages%2Fcoffee%2Fcappuccino.avif&w=640&q=75');
  });

  it('collapses a srcset to the single narrowest candidate', () => {
    /* Eight candidates per photograph across 25 recipes is tens of megabytes for
       a visitor who sees one width of each. */
    const { images } = worker.extractAssets(html);
    expect(worker.narrowestPerImage(images)).toEqual([
      '/_next/image?url=%2Fimages%2Fcoffee%2Fcappuccino.avif&w=640&q=75',
    ]);
  });

  it('keeps one candidate per distinct source image', () => {
    const picked = worker.narrowestPerImage([
      '/_next/image?url=%2Fa.avif&w=1200&q=75',
      '/_next/image?url=%2Fa.avif&w=640&q=75',
      '/_next/image?url=%2Fb.avif&w=750&q=75',
    ]);

    expect(picked.sort()).toEqual([
      '/_next/image?url=%2Fa.avif&w=640&q=75',
      '/_next/image?url=%2Fb.avif&w=750&q=75',
    ]);
  });

  it('ignores an image URL with no source parameter', () => {
    expect(worker.narrowestPerImage(['/_next/image?w=640&q=75'])).toEqual([]);
  });
});
