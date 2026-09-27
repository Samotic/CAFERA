import { isPrivateRoute } from './security-headers';

/**
 * The prefetch policy for a `<Link>`, in one place.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS RETURNS `undefined` AND NEVER `true`
 * ---------------------------------------------------------------------------
 * The three values mean genuinely different things in the App Router, and the
 * difference is easy to get backwards:
 *
 *   - `undefined` / `null` ("auto"): a **static** route is prefetched in full; a
 *     **dynamic** route is prefetched only as far as the nearest `loading`
 *     boundary.
 *   - `true`: the full route is prefetched **even when it is dynamic**.
 *   - `false`: never prefetched, on viewport or on hover.
 *
 * So `prefetch={!isPrivate(href)}` — the obvious spelling — is not "leave public
 * links alone". It is an upgrade from auto to full, and `/discover` is dynamic:
 * measured, that turned its prefetch into a **28 KB** `text/x-component`
 * response occupying 341-820 ms of a throttled mobile load of the home page,
 * inside the window the first paint was waiting on. Returning `undefined`
 * restores Next's own behaviour for anything public.
 *
 * A private route gets `false`. Those answer `private, no-store` and are
 * rendered per session, so the payload cannot be reused; the request spends
 * bandwidth the LCP element is waiting on and points a signed-out visitor's
 * browser at account routes on every page load.
 */
export function prefetchFor(href: string): false | undefined {
  return isPrivateRoute(href) ? false : undefined;
}

/**
 * The pathname a Next `href` points at. Query and fragment are dropped, so
 * `/discover?category=sweet` is tested as the `/discover` route.
 */
export function hrefPathname(href: string | { pathname?: string | null }): string {
  if (typeof href === 'string') return href.split(/[?#]/)[0] ?? '';
  return href.pathname ?? '';
}
