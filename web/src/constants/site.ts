/**
 * Site-wide constants. Anything that appears in metadata, structured data or a
 * canonical URL is defined once here so a domain change is a one-line change.
 */

export const SITE = {
  name: 'CAFERA',
  tagline: 'Discover. Brew. Enjoy.',
  description:
    'CAFERA is a premium coffee discovery platform. Explore 25+ specialty coffee recipes, follow step-by-step brewing guides, and build your own coffee collection.',
  /**
   * The public origin. Absolute URLs are required for Open Graph, canonicals and
   * the sitemap, so this must be set in production — a relative canonical is
   * silently ignored by crawlers.
   */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  locale: 'en_US',
  twitter: '@cafera',
} as const;

/** Primary destinations, in nav order. Used by the desktop header and bottom bar. */
export const PRIMARY_NAV = [
  { href: '/', label: 'Home', icon: 'house' },
  { href: '/discover', label: 'Discover', icon: 'compass' },
  { href: '/favorites', label: 'Favorites', icon: 'heart' },
  { href: '/my-cafe', label: 'My Café', icon: 'coffee' },
  { href: '/profile', label: 'Profile', icon: 'user' },
] as const;

export type NavItem = (typeof PRIMARY_NAV)[number];

/** Routes that require a session. Mirrored in proxy.ts, which enforces it. */
export const PROTECTED_ROUTES = ['/favorites', '/my-cafe', '/profile', '/welcome'] as const;

/** Routes a signed-in user should never see. */
export const AUTH_ROUTES = ['/login', '/register', '/forgot-password'] as const;

export const PROFILE_SECTIONS = [
  { href: '/profile/account', label: 'Account', description: 'Name, email and password' },
  {
    href: '/profile/preferences',
    label: 'Coffee Preferences',
    description: 'Tune your recommendations',
  },
  { href: '/profile/notifications', label: 'Notifications', description: 'What we email you' },
  { href: '/profile/appearance', label: 'Appearance', description: 'Theme, units and motion' },
  { href: '/profile/privacy', label: 'Privacy', description: 'Your data and account deletion' },
  { href: '/profile/about', label: 'About CAFERA', description: 'Version, terms and licences' },
] as const;

export const MY_CAFE_SECTIONS = [
  {
    href: '/my-cafe/recently-viewed',
    label: 'Recently Viewed',
    description: 'Pick up where you left off',
  },
  { href: '/favorites', label: 'Favorites', description: 'Everything you have saved' },
  { href: '/my-cafe/history', label: 'Coffee History', description: 'What you have brewed' },
  { href: '/my-cafe/custom', label: 'Custom Recipes', description: 'Your own creations' },
  { href: '/my-cafe/want-to-try', label: 'Want to Try', description: 'Your shortlist' },
] as const;
