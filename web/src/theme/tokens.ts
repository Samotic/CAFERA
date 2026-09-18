/**
 * TypeScript mirror of the values in globals.css that JavaScript also needs —
 * Framer Motion transitions, matchMedia queries and next/image `sizes` strings
 * cannot read CSS custom properties.
 *
 * Only duplicate a value here when JS genuinely needs it. Colours are absent on
 * purpose: they are consumed through Tailwind classes, so there is exactly one
 * place to change them.
 */

export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;

export type Breakpoint = keyof typeof BREAKPOINTS;

/** Matches the `--duration-*` tokens, in seconds for Framer Motion. */
export const DURATION = {
  fast: 0.15,
  base: 0.22,
  slow: 0.3,
} as const;

/** Matches `--ease-out` / `--ease-in-out`. */
export const EASE = {
  out: [0.22, 1, 0.36, 1],
  inOut: [0.65, 0, 0.35, 1],
} as const;

/**
 * `sizes` strings for next/image. Getting these right is the difference between
 * a 40 KB and a 400 KB card image on a phone, so they are named and reused
 * rather than re-typed per component.
 */
export const IMAGE_SIZES = {
  /** 4-up grid at xl, 3-up at md, 2-up at sm, full width below. */
  grid: '(min-width: 1536px) 20vw, (min-width: 1280px) 25vw, (min-width: 768px) 33vw, (min-width: 640px) 50vw, 100vw',
  /** Fixed-width cards inside a horizontal rail. */
  rail: '(min-width: 768px) 280px, 70vw',
  /** Full-bleed hero on the detail page and the home feature card. */
  hero: '(min-width: 1024px) 50vw, 100vw',
  /** Small square thumbnails in lists and My Café rows. */
  thumb: '96px',
} as const;

/** Breakpoint at which the bottom tab bar gives way to the desktop top nav. */
export const DESKTOP_NAV_BREAKPOINT = BREAKPOINTS.lg;
