/**
 * WCAG contrast maths, and a parser for the `light-dark()` token pairs in
 * globals.css.
 *
 * This exists so the contrast audit is executable rather than a spreadsheet
 * somebody ran once. `globals.css` stays the single source of truth for colour;
 * nothing here re-declares a value, it only reads and measures what is already
 * there. A token edit therefore cannot drift away from its verified ratio
 * without the test noticing.
 *
 * Formulae: WCAG 2.1 relative luminance and contrast ratio.
 * https://www.w3.org/TR/WCAG21/#dfn-relative-luminance
 */

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function hexToRgb(hex: string): Rgb {
  const normalised = hex.trim().replace('#', '');
  const full =
    normalised.length === 3
      ? normalised
          .split('')
          .map((char) => char + char)
          .join('')
      : normalised;

  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const channel = (value: number) =>
    Math.max(0, Math.min(255, Math.round(value)))
      .toString(16)
      .padStart(2, '0');
  return `#${channel(r)}${channel(g)}${channel(b)}`.toUpperCase();
}

function channelLuminance(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : Math.pow((scaled + 0.055) / 1.055, 2.4);
}

export function relativeLuminance(colour: Rgb): number {
  return (
    0.2126 * channelLuminance(colour.r) +
    0.7152 * channelLuminance(colour.g) +
    0.0722 * channelLuminance(colour.b)
  );
}

export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(hexToRgb(foreground));
  const b = relativeLuminance(hexToRgb(background));
  const [lighter, darker] = a > b ? [a, b] : [b, a];
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Composites a partially transparent foreground over an opaque background.
 *
 * Needed for disabled states: `disabled:opacity-55` does not change the colour
 * token, it changes what the eye actually receives, and that composite is what
 * has to be measured. Measuring the underlying token would report a passing
 * ratio for text nobody can read.
 */
export function composite(foreground: string, background: string, alpha: number): string {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  return rgbToHex({
    r: fg.r * alpha + bg.r * (1 - alpha),
    g: fg.g * alpha + bg.g * (1 - alpha),
    b: fg.b * alpha + bg.b * (1 - alpha),
  });
}

export type ThemeHalf = 'light' | 'dark';

/**
 * Extracts `--token: light-dark(#light, #dark);` declarations from a stylesheet.
 *
 * Deliberately strict: it matches only the hex/hex form the design system uses.
 * A token written any other way is not silently skipped — `parseThemeTokens`
 * returns only what it understood, and the test asserts that every token it
 * needs was found, so an unparsed token surfaces as a failure rather than as a
 * check that quietly stopped running.
 */
export function parseThemeTokens(css: string): Record<string, Record<ThemeHalf, string>> {
  const tokens: Record<string, Record<ThemeHalf, string>> = {};
  const pattern =
    /(--[\w-]+):\s*light-dark\(\s*(#[0-9a-fA-F]{3,8})\s*,\s*(#[0-9a-fA-F]{3,8})\s*\)/g;

  for (const match of css.matchAll(pattern)) {
    const [, name, light, dark] = match;
    if (!name || !light || !dark) continue;
    tokens[name] = { light: light.toUpperCase(), dark: dark.toUpperCase() };
  }

  return tokens;
}

/** WCAG 2.1 AA thresholds. */
export const AA = {
  /** Body text and anything below 18.66px bold / 24px regular. */
  bodyText: 4.5,
  /** Large text, and the boundary of a meaningful UI component. */
  largeTextOrUi: 3,
  /** A focus indicator against both the component and what surrounds it. */
  focusIndicator: 3,
} as const;

export function verdict(ratio: number, threshold: number): 'pass' | 'fail' {
  return ratio >= threshold ? 'pass' : 'fail';
}
