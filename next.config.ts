import bundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';
import {
  BASE_SECURITY_HEADERS,
  buildCsp,
  PRIVATE_CACHE_CONTROL,
  PRIVATE_ROUTE_PREFIXES,
} from './src/lib/security-headers';

/**
 * Remote image hosts.
 *
 * next/image refuses any origin not listed here, which doubles as a content
 * allow-list: a compromised recipe record cannot point the browser at an
 * arbitrary host. Seeded recipe photography is served from /public; only
 * user-uploaded media travels through Cloudinary.
 */
const cloudinaryCloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  images: {
    formats: ['image/avif', 'image/webp'],
    // Matches the layout breakpoints in theme/breakpoints.ts.
    deviceSizes: [360, 480, 640, 768, 1024, 1280, 1536, 1920],
    imageSizes: [64, 96, 128, 192, 256, 384],
    remotePatterns: [
      {
        protocol: 'https' as const,
        hostname: 'images.unsplash.com',
      },
      ...(cloudinaryCloudName
        ? [
            {
              protocol: 'https' as const,
              hostname: 'res.cloudinary.com',
              pathname: `/${cloudinaryCloudName}/**`,
            },
          ]
        : []),
    ],
  },

  /* No `rewrites()`. It existed only to proxy /api/* to the separate Express
     origin so the browser would see one origin and the refresh cookie would be
     first-party. There is no second origin now — Server Actions and Route
     Handlers run in this app — so the topology it created is the default rather
     than something to arrange. */

  /**
   * All security headers are static now.
   *
   * Under the previous nonce CSP they had to be emitted per response from the
   * proxy, because a nonce cannot live in a static header. A hash can, which is
   * what lets the whole policy move here and the HTML become cacheable.
   *
   * See src/lib/security-headers.ts for the decision record, including the
   * warning that applies if a nonce is ever reintroduced.
   */
  async headers() {
    const isDev = process.env.NODE_ENV !== 'production';

    /**
     * `isSecure` must mean "actually served over HTTPS", not "built for
     * production". A static header cannot inspect the request protocol the way
     * the old proxy could, so it keys on the platform instead: `VERCEL` is set
     * only in a Vercel deployment, which is always HTTPS.
     *
     * Deriving it from NODE_ENV alone reintroduces a bug already fixed once —
     * `upgrade-insecure-requests` on a plain-HTTP origin rewrites every
     * subresource to https://, finds no TLS listener, and the page renders
     * completely unstyled. Chromium and Firefox mask it by exempting loopback;
     * WebKit does not, so it appears as a total failure of the E2E suite in one
     * engine only. That is exactly how it was caught, twice.
     */
    const isSecure = Boolean(process.env.VERCEL);
    const csp = buildCsp({ isDev, isSecure });

    return [
      {
        source: '/:path*',
        headers: [
          ...BASE_SECURITY_HEADERS.map((header) => ({ ...header })),
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
      /* Session-rendered routes, listed before the public default so the more
         specific rule is the one that applies. A shared cache holding one of
         these would serve one person's favourites to the next visitor. */
      ...PRIVATE_ROUTE_PREFIXES.flatMap((prefix) => [
        { source: prefix, headers: [{ key: 'Cache-Control', value: PRIVATE_CACHE_CONTROL }] },
        {
          source: `${prefix}/:path*`,
          headers: [{ key: 'Cache-Control', value: PRIVATE_CACHE_CONTROL }],
        },
      ]),
    ];
  },

  experimental: {
    // Import only the icons actually used instead of the whole lucide barrel.
    optimizePackageImports: ['lucide-react'],
  },

  typescript: {
    // A build that ships type errors is a build that ships bugs.
    ignoreBuildErrors: false,
  },

  /* Next 16 removed `next lint` and the `eslint` config key; linting is a
     separate `npm run lint` step, enforced by the pre-commit hook and by CI. */
};

export default bundleAnalyzer({ enabled: process.env.ANALYZE === 'true' })(nextConfig);
