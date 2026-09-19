import { NextResponse, type NextRequest } from 'next/server';
import { isPrivateRoute, PRIVATE_CACHE_CONTROL } from '@/lib/security-headers';

/**
 * Request-time headers for session-rendered routes.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS NOW ALMOST EMPTY
 * ---------------------------------------------------------------------------
 * Under the nonce CSP this file did the heavy lifting: it minted a nonce per
 * response and emitted the whole policy, which is why every document had to be
 * generated per request. The policy is hash-based now and lives in
 * `next.config.ts` as static headers, so nothing security-related needs to run
 * here at all.
 *
 * ---------------------------------------------------------------------------
 * WHY THE MATCHER LISTS ONLY PRIVATE ROUTES
 * ---------------------------------------------------------------------------
 * This is the load-bearing detail. Anything the proxy matches is routed through
 * a function before it can be served from the CDN's static cache — so a matcher
 * of `/:path*` would quietly undo the static rendering that Task D exists to
 * enable, while every header still looked correct.
 *
 * Public routes (`/`, `/discover`, `/recipes/*`) are therefore deliberately
 * *not* matched. They are prerendered, CDN-cacheable, and get their headers
 * statically from `next.config.ts`.
 *
 * Phase 3 adds the optimistic session-cookie redirect here. That only ever
 * applies to private routes, so the matcher below is already the right shape
 * for it.
 */

export function proxy(request: NextRequest): NextResponse {
  const response = NextResponse.next();

  /* A second, prefix-based enforcement of the private cache policy. The static
     rules in next.config.ts cover the same routes; this is what makes a newly
     added sub-route private by inheritance rather than by someone remembering
     to add a source pattern. A shared cache holding one of these would serve
     one person's favourites to the next visitor. */
  if (isPrivateRoute(request.nextUrl.pathname)) {
    response.headers.set('Cache-Control', PRIVATE_CACHE_CONTROL);
    response.headers.set('Vary', 'Cookie');
  }

  return response;
}

export const config = {
  /**
   * Private routes only. Extending this to public routes would route
   * prerendered HTML through a function and defeat CDN caching — see above.
   */
  matcher: [
    '/profile/:path*',
    '/favorites/:path*',
    '/my-cafe/:path*',
    '/welcome',
    '/login',
    '/register',
    '/forgot-password',
    '/reset-password/:path*',
  ],
};
