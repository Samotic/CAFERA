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
  preload: true,
});

export const fontSans = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
});

/** Applied to <html> so both families are available as CSS variables everywhere. */
export const fontVariables = `${fontDisplay.variable} ${fontSans.variable}`;
