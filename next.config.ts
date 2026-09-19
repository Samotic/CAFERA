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

  /* No `rewrites()`. It existed only to proxy /api/* to the separate Express
     origin so the browser would see one origin and the refresh cookie would be
     first-party. There is no second origin now — Server Actions and Route
     Handlers run in this app — so the topology it created is the default rather
     than something to arrange. */

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
