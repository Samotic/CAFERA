/**
 * CAFERA service worker — offline support for the public catalogue.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A HAND-WRITTEN STATIC FILE AND NOT A GENERATED BUNDLE
 * ---------------------------------------------------------------------------
 * The obvious approach is a build plugin that emits a precache manifest listing
 * every hashed chunk. That couples the worker to the build: the manifest has to
 * be written *after* `next build` (the hashes do not exist before it) but read
 * from `public/`, which Vercel uploads *from* the build. The window is wrong in
 * both directions, and the failure mode is a worker that precaches URLs that
 * 404 — which install treats as fatal, so the worker never activates and
 * offline silently does nothing.
 *
 * So this worker discovers its own asset list instead: it fetches the documents
 * it wants to make available offline, then reads the `/_next/static/...` and
 * `/_next/image?...` URLs back out of that HTML. Whatever the build produced is
 * by definition what the HTML references. No manifest, no build step, no hash
 * coupling, and nothing to keep in sync.
 *
 * The page list comes from `/sitemap.xml` for the same reason: it is already
 * generated from `RECIPE_SEED`, so "every recipe" cannot drift from "every
 * recipe the worker caches". Adding a drink needs no change here.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS DELIBERATELY *NOT* CACHED
 * ---------------------------------------------------------------------------
 * Private routes. A service worker cache is per-browser rather than shared, so
 * this is not the CDN hazard that `private, no-store` exists to prevent — but a
 * shared device is still a shared device, and a cached /favorites surviving a
 * sign-out is the same class of bug. `isPrivatePath` skips them entirely, and
 * `isCacheable` refuses anything whose response says `no-store` or `private`
 * regardless of its path. Two independent checks, because the first one is a
 * list and lists go stale.
 *
 * `src/lib/service-worker.test.ts` asserts that list still matches
 * `PRIVATE_ROUTE_PREFIXES` in `src/lib/security-headers.ts`.
 */

const VERSION = 'v1';
const SHELL_CACHE = `cafera-shell-${VERSION}`;
const IMAGE_CACHE = `cafera-images-${VERSION}`;
const CACHES = [SHELL_CACHE, IMAGE_CACHE];

/** Always precached, whether or not the sitemap mentions them. */
const CORE_PATHS = ['/', '/discover', '/manifest.webmanifest', '/icon.svg'];

/**
 * Kept in step with `PRIVATE_ROUTE_PREFIXES` by a unit test — this file cannot
 * import the constant, being a classic script served straight from `public/`.
 */
const PRIVATE_PREFIXES = [
  '/profile',
  '/favorites',
  '/my-cafe',
  '/welcome',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
];

/** Re-precache at most this often, so a long-lived install still picks up new recipes. */
const RESYNC_INTERVAL_MS = 24 * 60 * 60 * 1000;
const SYNC_STAMP_URL = '/__sw-precache-stamp';

function isPrivatePath(pathname) {
  return PRIVATE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * A response is only worth keeping if it is a real, complete, public 200.
 *
 * `response.type === 'opaque'` covers a no-cors cross-origin response, whose
 * status reads 0 — caching one stores an unreadable body that then satisfies
 * every future request for that URL.
 */
function isCacheable(response) {
  if (!response || !response.ok || response.type === 'opaque') return false;

  const control = (response.headers.get('cache-control') || '').toLowerCase();
  return !control.includes('no-store') && !control.includes('private');
}

/* ------------------------------------------------------------------ discovery */

/**
 * Public page paths, from the sitemap.
 *
 * Only the pathname is used. The sitemap holds absolute URLs built from
 * `NEXT_PUBLIC_SITE_URL`, which on a preview deployment is the *production*
 * origin — precaching those would cross origins and fail. Resolving each path
 * against `self.location.origin` keeps the worker correct wherever it is served.
 */
async function sitemapPaths() {
  try {
    const response = await fetch('/sitemap.xml', { cache: 'no-store' });
    if (!response.ok) return [];

    const xml = await response.text();
    const paths = [];

    for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
      try {
        paths.push(new URL(match[1].trim()).pathname);
      } catch {
        /* A malformed <loc> is not worth failing the whole install over. */
      }
    }

    return paths;
  } catch {
    return [];
  }
}

/**
 * Subresource URLs referenced by a document.
 *
 * Reading them out of the HTML rather than out of a build manifest is what lets
 * this file stay static. `&amp;` has to be undone because these come from
 * attribute values, where `/_next/image?url=x&w=640` is serialised with the
 * ampersand escaped — cache a URL with the entity still in it and every lookup
 * misses.
 */
function extractAssets(html) {
  const statics = new Set();
  const images = new Set();

  for (const match of html.matchAll(/\/_next\/static\/[A-Za-z0-9._/-]+/g)) {
    statics.add(match[0]);
  }

  for (const match of html.matchAll(/\/_next\/image\?[^"'\s]+/g)) {
    images.add(match[0].replace(/&amp;/g, '&'));
  }

  return { statics: [...statics], images: [...images] };
}

/**
 * One width per distinct source image.
 *
 * A `srcset` offers eight candidates per photograph; caching all of them for 25
 * recipes would mean hundreds of requests and tens of megabytes for a visitor
 * who will ever see one of each. The narrowest candidate is cached, and
 * `matchImageIgnoringWidth` serves it for any width when the network is gone —
 * a 640px photograph scaled up beats a broken box, and online the exact width
 * is fetched normally.
 */
function narrowestPerImage(imageUrls) {
  const bySource = new Map();

  for (const raw of imageUrls) {
    const url = new URL(raw, self.location.origin);
    const source = url.searchParams.get('url');
    if (!source) continue;

    const width = Number(url.searchParams.get('w')) || Number.MAX_SAFE_INTEGER;
    const current = bySource.get(source);

    if (!current || width < current.width) {
      bySource.set(source, { width, path: url.pathname + url.search });
    }
  }

  return [...bySource.values()].map((entry) => entry.path);
}

/* ------------------------------------------------------------------ precache */

/**
 * Caches one URL, tolerating failure.
 *
 * `cache.addAll` rejects the whole batch if any single request fails, and an
 * install that rejects leaves the worker permanently unactivated. One missing
 * chunk should cost that chunk, not offline support altogether.
 */
async function cacheOne(cache, path) {
  try {
    const response = await fetch(path, { cache: 'no-store', credentials: 'omit' });
    if (!isCacheable(response)) return false;

    await cache.put(path, response);
    return true;
  } catch {
    return false;
  }
}

async function cacheAllIndependently(cache, paths) {
  const results = await Promise.all(paths.map((path) => cacheOne(cache, path)));
  return results.filter(Boolean).length;
}

/**
 * Builds the offline catalogue: every public page, the assets those pages
 * reference, and one width of every photograph on them.
 */
async function precache() {
  const shell = await caches.open(SHELL_CACHE);
  const images = await caches.open(IMAGE_CACHE);

  const discovered = await sitemapPaths();
  const pages = [...new Set([...CORE_PATHS, ...discovered])].filter((path) => !isPrivatePath(path));

  /* Documents first, because they are what the rest is derived from. */
  const documents = await Promise.all(
    pages.map(async (path) => {
      try {
        const response = await fetch(path, { cache: 'no-store', credentials: 'omit' });
        if (!isCacheable(response)) return null;

        /* The body can only be read once, so clone before caching. */
        const html = response.headers.get('content-type')?.includes('text/html')
          ? await response.clone().text()
          : '';

        await shell.put(path, response);
        return html;
      } catch {
        return null;
      }
    }),
  );

  const statics = new Set();
  const imageUrls = new Set();

  for (const html of documents) {
    if (!html) continue;
    const assets = extractAssets(html);
    for (const asset of assets.statics) statics.add(asset);
    for (const asset of assets.images) imageUrls.add(asset);
  }

  const [staticCount, imageCount] = await Promise.all([
    cacheAllIndependently(shell, [...statics]),
    cacheAllIndependently(images, narrowestPerImage([...imageUrls])),
  ]);

  await shell.put(
    SYNC_STAMP_URL,
    new Response(String(Date.now()), { headers: { 'content-type': 'text/plain' } }),
  );

  return {
    pages: documents.filter(Boolean).length,
    statics: staticCount,
    images: imageCount,
  };
}

/** Re-precaches only if the last sweep is old enough to have missed a deploy. */
async function precacheIfStale() {
  const shell = await caches.open(SHELL_CACHE);
  const stamp = await shell.match(SYNC_STAMP_URL);

  if (stamp) {
    const at = Number(await stamp.text());
    if (Number.isFinite(at) && Date.now() - at < RESYNC_INTERVAL_MS) return null;
  }

  return precache();
}

/* -------------------------------------------------------------------- serving */

/** Cache-first. For hashed, immutable URLs there is nothing to revalidate. */
async function cacheFirst(cacheName, request) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(request);
  if (hit) return hit;

  const response = await fetch(request);
  if (isCacheable(response)) await cache.put(request, response.clone());
  return response;
}

/**
 * Any cached width of the same source image.
 *
 * `next/image` picks a width from the device's DPR and viewport, so the URL a
 * visitor requests offline is frequently not the one that was precached. Without
 * this the photograph is simply missing; with it the box is filled.
 */
async function matchImageIgnoringWidth(request) {
  const wanted = new URL(request.url).searchParams.get('url');
  if (!wanted) return undefined;

  const cache = await caches.open(IMAGE_CACHE);

  for (const key of await cache.keys()) {
    if (new URL(key.url).searchParams.get('url') === wanted) {
      return cache.match(key);
    }
  }

  return undefined;
}

async function imageStrategy(request) {
  const cache = await caches.open(IMAGE_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;

  try {
    const response = await fetch(request);
    if (isCacheable(response)) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const fallback = await matchImageIgnoringWidth(request);
    if (fallback) return fallback;
    throw error;
  }
}

/**
 * Network-first for documents.
 *
 * Cache-first would be faster but would serve yesterday's recipe to an online
 * visitor, and these pages are statically rendered and CDN-cached already — the
 * network path is fast. The cache is the offline fallback, and every online
 * navigation refreshes it.
 */
async function documentStrategy(request) {
  const cache = await caches.open(SHELL_CACHE);

  try {
    const response = await fetch(request);
    if (isCacheable(response)) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const hit = await cache.match(request, { ignoreSearch: true });
    if (hit) return hit;

    const home = await cache.match('/');
    if (home) return home;

    throw error;
  }
}

/* --------------------------------------------------------------- event wiring */

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith('cafera-') && !CACHES.includes(name))
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'sync-precache') {
    event.waitUntil(precacheIfStale());
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  /* Only same-origin GETs. Anything else is left to the browser: a POST must
     never be replayed from a cache, and there is no cross-origin traffic to
     handle — the application deliberately makes none. */
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (isPrivatePath(url.pathname)) return;

  /* React Server Component payloads carry a build-specific hash and are not
     meaningfully cacheable. Left unhandled, so that offline the fetch fails and
     the App Router falls back to a full navigation — which the document cache
     below can serve. */
  if (url.searchParams.has('_rsc') || request.headers.get('RSC') === '1') return;

  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(SHELL_CACHE, request));
    return;
  }

  if (url.pathname.startsWith('/_next/image') || url.pathname.startsWith('/images/')) {
    event.respondWith(imageStrategy(request));
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(documentStrategy(request));
  }
});
