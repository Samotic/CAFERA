import { Fraunces, Inter } from 'next/font/google';

/**
 * Typography.
 *
 * Fraunces is a high-contrast variable serif with a "soft" axis — it reads as
 * warm and editorial rather than institutional, which is the register a premium
 * coffee publication wants for headings. Inter carries body copy and UI, where
 * legibility at 14-16px matters more than character.
 *
 * Both are self-hosted by next/font: no external font-CDN request, no render-
 * blocking stylesheet, and `display: swap` plus preloading means text is visible
 * immediately and never shifts once the face arrives.
 */

export const fontDisplay = Fraunces({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-fraunces',
  /* Variable weight (no `weight` key) is what lets the extra axes be requested:
     SOFT rounds the terminals, opsz tunes contrast to the rendered size. */
  axes: ['SOFT', 'opsz'],
  /**
   * Not preloaded, deliberately — measured, not assumed.
   *
   * Carrying two extra axes makes this face **118 KB**, against 47 KB for Inter.
   * Preloading both put 165 KB of `high`-priority bytes in front of the
   * stylesheet and the hero image. On throttled mobile, LCP came out *equal to
   * FCP* on `/` and on a recipe page — that is, the largest element was already
   * painting at the first paint, so LCP was gated entirely by how long first
   * paint took, and first paint was queued behind these fonts.
   *
   * Dropping this one preload leaves the face self-hosted and same-origin; it is
   * simply fetched at the priority the CSS gives it instead of ahead of the CSS.
   * Headings paint in the size-adjusted fallback and swap, which is why CLS
   * stays at 0.000 — next/font matches the fallback's metrics to this face.
   *
   * Inter keeps its preload: it carries body copy and UI, so it is needed for
   * the first paint that this change is protecting.
   */
  preload: false,
});

export const fontSans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
});

/** Applied to <html> so both families are available as CSS variables everywhere. */
export const fontVariables = `${fontDisplay.variable} ${fontSans.variable}`;
