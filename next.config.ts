import bundleAnalyzer from '@next/bundle-analyzer';
import type { NextConfig } from 'next';

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
    remotePatterns: cloudinaryCloudName
      ? [
          {
            protocol: 'https',
            hostname: 'res.cloudinary.com',
            pathname: `/${cloudinaryCloudName}/**`,
          },
        ]
      : [],
  },

  /**
   * COOKIE TOPOLOGY — same-origin via proxy (Option B).
   *
   * The browser only ever sees one origin. `/api/*` is rewritten here to the
   * Express service, so every request the browser makes is first-party and the
   * refresh cookie is a first-party cookie.
   *
   * This is what lets the refresh cookie use `SameSite=Strict`, and it avoids
   * the failure that sinks a genuinely cross-site split: a frontend on
   * `*.vercel.app` talking to an API on `*.railway.app` needs `SameSite=None`,
   * which makes the refresh cookie a THIRD-PARTY cookie — blocked outright by
   * Safari's ITP and by Firefox's Total Cookie Protection. Login appears to
   * succeed and the session silently fails to persist, on the browsers you are
   * least likely to be developing in.
   *
   * `API_INTERNAL_URL` is preferred when set, so in production the hop happens
   * over the platform's private network rather than back out to the internet.
   */
  async rewrites() {
    /* `??` is not enough here: an unset variable in a .env file is an EMPTY
       STRING, not undefined, and `?? ` happily passes it through. That produced
       a destination of `/api/:path*` — the rewrite pointing at itself — and
       every API call 404'd against the Next app instead of reaching Express. */
    const firstNonEmpty = (...values: Array<string | undefined>): string | undefined =>
      values.find((value) => typeof value === 'string' && value.trim().length > 0)?.trim();

    const apiOrigin =
      firstNonEmpty(process.env.API_INTERNAL_URL, process.env.NEXT_PUBLIC_API_URL) ??
      'http://localhost:4000';

    return [
      {
        source: '/api/:path*',
        destination: `${apiOrigin.replace(/\/$/, '')}/api/:path*`,
      },
    ];
  },

  /**
   * Headers that do not depend on a per-request nonce. The CSP itself is emitted
   * from proxy.ts, because a nonce must be generated per response and a static
   * header cannot carry one.
   */
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
        ],
      },
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
