import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { AA, composite, contrastRatio, parseThemeTokens, type ThemeHalf } from './contrast';

/**
 * The contrast audit, as a test.
 *
 * A spreadsheet somebody ran once is not a control — the palette drifts, a token
 * gets nudged to look better, and nobody re-measures. This reads the real
 * `globals.css`, so it measures what actually ships, and it covers **both halves
 * of every `light-dark()` pair**. The Phase 1 audit checked only text tokens
 * against cream and passed; this table then found seven genuine failures,
 * four of them in the light half that was believed verified:
 *
 *   border-strong  2.18 light / 2.49 dark  (input and control edges)
 *   focus ring     2.66 light / 1.38 dark  (on inverse surfaces)
 *   accent as a graphic fill  2.83 light   (rating stars)
 *
 * The pairs below are a usage contract, not a guess: each one is a combination
 * that genuinely occurs in a component. Adding a new colour pairing to the UI
 * means adding a row here.
 */

const CSS = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');
const TOKENS = parseThemeTokens(CSS);

/** Tokens declared as a single value rather than a `light-dark()` pair. */
const FLAT_TOKENS: Record<string, string> = (() => {
  const flat: Record<string, string> = {};
  for (const match of CSS.matchAll(/(--color-[\w-]+):\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    const [, name, value] = match;
    if (name && value) flat[name] = value.toUpperCase();
  }
  return flat;
})();

function resolve(token: string, half: ThemeHalf): string {
  const pair = TOKENS[token];
  if (pair) return pair[half];
  const flat = FLAT_TOKENS[token];
  if (flat) return flat;
  throw new Error(
    `Token ${token} was not found in globals.css. If it was renamed, update this ` +
      'table — a check that silently stops running is worse than no check.',
  );
}

interface Pairing {
  fg: string;
  bg: string;
  min: number;
  where: string;
}

/** Text: WCAG 1.4.3, 4.5:1. */
const TEXT_PAIRS: Pairing[] = [
  { fg: '--color-text', bg: '--color-page', min: AA.bodyText, where: 'body text on page' },
  { fg: '--color-text', bg: '--color-card', min: AA.bodyText, where: 'body text on card' },
  { fg: '--color-text', bg: '--color-sunken', min: AA.bodyText, where: 'body text on sunken' },
  { fg: '--color-text', bg: '--color-raised', min: AA.bodyText, where: 'body text on raised' },
  {
    fg: '--color-text-secondary',
    bg: '--color-page',
    min: AA.bodyText,
    where: 'secondary text on page',
  },
  {
    fg: '--color-text-secondary',
    bg: '--color-card',
    min: AA.bodyText,
    where: 'secondary text on card',
  },
  {
    fg: '--color-text-secondary',
    bg: '--color-sunken',
    min: AA.bodyText,
    where: 'secondary text on sunken',
  },
  { fg: '--color-text-muted', bg: '--color-page', min: AA.bodyText, where: 'muted text on page' },
  {
    fg: '--color-text-muted',
    bg: '--color-card',
    min: AA.bodyText,
    where: 'muted text and input placeholder on card',
  },
  {
    fg: '--color-text-muted',
    bg: '--color-sunken',
    min: AA.bodyText,
    where: 'muted text on sunken',
  },
  {
    fg: '--color-text-muted',
    bg: '--color-raised',
    min: AA.bodyText,
    where: 'muted text on raised',
  },
  { fg: '--color-accent-text', bg: '--color-page', min: AA.bodyText, where: 'link text on page' },
  { fg: '--color-accent-text', bg: '--color-card', min: AA.bodyText, where: 'link text on card' },
  {
    fg: '--color-accent-text',
    bg: '--color-sunken',
    min: AA.bodyText,
    where: 'link text on sunken',
  },
  {
    fg: '--color-accent-text',
    bg: '--color-accent-soft',
    min: AA.bodyText,
    where: 'selected chip and filter pill label',
  },
  {
    fg: '--color-on-primary',
    bg: '--color-primary',
    min: AA.bodyText,
    where: 'primary button label',
  },
  {
    fg: '--color-on-primary',
    bg: '--color-primary-hover',
    min: AA.bodyText,
    where: 'primary button label on hover',
  },
  {
    fg: '--color-on-inverse',
    bg: '--color-inverse',
    min: AA.bodyText,
    where: 'text on inverse surface',
  },
  { fg: '--color-danger', bg: '--color-page', min: AA.bodyText, where: 'form error on page' },
  { fg: '--color-danger', bg: '--color-card', min: AA.bodyText, where: 'form error on card' },
  {
    fg: '--color-danger',
    bg: '--color-danger-soft',
    min: AA.bodyText,
    where: 'error text on its own tint',
  },
  { fg: '--color-success', bg: '--color-card', min: AA.bodyText, where: 'success toast text' },
  { fg: '--color-warning', bg: '--color-card', min: AA.bodyText, where: 'warning text' },
];

/** Non-text UI: WCAG 1.4.11, 3:1. */
const UI_PAIRS: Pairing[] = [
  {
    fg: '--color-border-strong',
    bg: '--color-page',
    min: AA.largeTextOrUi,
    where: 'input and control edge on page',
  },
  {
    fg: '--color-border-strong',
    bg: '--color-card',
    min: AA.largeTextOrUi,
    where: 'input and control edge on card',
  },
  {
    fg: '--color-border-strong',
    bg: '--color-sunken',
    min: AA.largeTextOrUi,
    where: 'input and control edge on sunken',
  },
  {
    fg: '--color-accent-line',
    bg: '--color-page',
    min: AA.largeTextOrUi,
    where: 'active nav indicator',
  },
  {
    fg: '--color-accent-line',
    bg: '--color-card',
    min: AA.largeTextOrUi,
    where: 'rating star fill on card',
  },
  {
    fg: '--color-accent-line',
    bg: '--color-accent-soft',
    min: AA.largeTextOrUi,
    where: 'selected chip border',
  },
];

/**
 * The focus indicator, WCAG 2.4.11/1.4.11.
 *
 * It gets its own block because it is the one indicator that can land on *any*
 * surface — including the inverse ones, where a themed pair could not cover it.
 * That is why `--color-focus` is a single value rather than a `light-dark()` pair.
 */
const FOCUS_SURFACES = [
  '--color-page',
  '--color-card',
  '--color-sunken',
  '--color-raised',
  '--color-inverse',
  '--color-accent-soft',
  '--color-primary',
];

const HALVES: ThemeHalf[] = ['light', 'dark'];

describe.each(HALVES)('%s theme — text contrast (WCAG 1.4.3, 4.5:1)', (half) => {
  it.each(TEXT_PAIRS)('$where', ({ fg, bg, min }) => {
    const ratio = contrastRatio(resolve(fg, half), resolve(bg, half));
    expect(
      ratio,
      `${fg} (${resolve(fg, half)}) on ${bg} (${resolve(bg, half)}) in ${half} theme`,
    ).toBeGreaterThanOrEqual(min);
  });
});

describe.each(HALVES)('%s theme — non-text UI contrast (WCAG 1.4.11, 3:1)', (half) => {
  it.each(UI_PAIRS)('$where', ({ fg, bg, min }) => {
    const ratio = contrastRatio(resolve(fg, half), resolve(bg, half));
    expect(
      ratio,
      `${fg} (${resolve(fg, half)}) on ${bg} (${resolve(bg, half)}) in ${half} theme`,
    ).toBeGreaterThanOrEqual(min);
  });
});

describe.each(HALVES)('%s theme — focus indicator on every surface it can land on', (half) => {
  it.each(FOCUS_SURFACES)('at least one ring tone is visible on %s', (surface) => {
    /* The ring is two-tone, so the requirement is that *one of them* clears 3:1 —
       whichever tone the surface swallows, the other still reads. Testing only
       one tone is how the single-colour version passed while being invisible on
       the dark primary button. */
    const inner = resolve('--color-focus', half);
    const outer = resolve('--color-focus-halo', half);
    const background = resolve(surface, half);

    const best = Math.max(contrastRatio(inner, background), contrastRatio(outer, background));

    expect(
      best,
      `Focus ring (${inner} banded by ${outer}) on ${surface} (${background}) in ${half} theme. ` +
        'A keyboard user who tabs onto this surface must still see where they are.',
    ).toBeGreaterThanOrEqual(AA.focusIndicator);
  });
});

describe('focus ring is two-tone and theme-independent', () => {
  it('declares both tones as flat values, not light-dark() pairs', () => {
    /* Themed values cannot cover the inverse surface — the light one measured
       2.66:1 there and the dark one 1.38:1. If someone reintroduces a pair, this
       fails and points at the reason. */
    expect(TOKENS['--color-focus']).toBeUndefined();
    expect(TOKENS['--color-focus-halo']).toBeUndefined();
    expect(FLAT_TOKENS['--color-focus']).toMatch(/^#[0-9A-F]{6}$/);
    expect(FLAT_TOKENS['--color-focus-halo']).toMatch(/^#[0-9A-F]{6}$/);
  });

  it('keeps the two tones distinguishable from each other', () => {
    // A band nobody can see as a band is just a thick single-colour ring.
    const ratio = contrastRatio(FLAT_TOKENS['--color-focus']!, FLAT_TOKENS['--color-focus-halo']!);
    expect(ratio).toBeGreaterThanOrEqual(AA.largeTextOrUi);
  });

  it('is visible against ANY possible surface, not merely the ones we ship', () => {
    /* Scans the whole luminance range. This is what makes the ring provably
       correct rather than "correct for today's palette" — a new surface colour
       added later cannot break it. */
    const inner = FLAT_TOKENS['--color-focus']!;
    const outer = FLAT_TOKENS['--color-focus-halo']!;

    let worst = Number.POSITIVE_INFINITY;
    for (let step = 0; step <= 255; step += 1) {
      const grey = `#${step.toString(16).padStart(2, '0').repeat(3)}`;
      worst = Math.min(worst, Math.max(contrastRatio(inner, grey), contrastRatio(outer, grey)));
    }

    expect(worst, 'worst-case contrast across every possible background').toBeGreaterThanOrEqual(
      AA.focusIndicator,
    );
  });
});

describe.each(HALVES)('%s theme — disabled states', (half) => {
  /**
   * WCAG 1.4.3 exempts inactive components, so these are reported rather than
   * enforced at 4.5:1 — but the exemption is routinely claimed for text that is
   * merely *styled* muted while remaining interactive, which is not exempt.
   *
   * The check that matters is therefore the one below it: every muted **enabled**
   * text token is held to the full 4.5:1 in the text table above, with no
   * exemption available.
   */
  const DISABLED_OPACITY = 0.65;

  it('keeps a genuinely disabled control legible', () => {
    const label = resolve('--color-on-primary', half);
    const surface = resolve('--color-primary', half);
    const page = resolve('--color-page', half);

    const effectiveSurface = composite(surface, page, DISABLED_OPACITY);
    const effectiveLabel = composite(label, effectiveSurface, DISABLED_OPACITY);
    const ratio = contrastRatio(effectiveLabel, effectiveSurface);

    /* Disabled controls are exempt from 1.4.3, so this is not held to 4.5:1 —
       but "exempt" is not "illegible", and the dark-theme caramel button
       measured 2.17:1 when faded, which is a smear rather than a control. */
    expect(ratio, `disabled primary button in ${half} theme`).toBeGreaterThanOrEqual(2.0);
  });

  it('holds muted-but-enabled text to the full text threshold, with no exemption', () => {
    // `text-text-muted` styles hints and secondary copy that are NOT disabled.
    const ratio = contrastRatio(resolve('--color-text-muted', half), resolve('--color-card', half));
    expect(ratio).toBeGreaterThanOrEqual(AA.bodyText);
  });
});

describe('token table integrity', () => {
  it('parsed every token the audit depends on', () => {
    // Guards against a silent pass caused by a rename: `resolve` throws on a
    // missing token rather than skipping the row.
    const referenced = new Set([
      ...TEXT_PAIRS.flatMap((p) => [p.fg, p.bg]),
      ...UI_PAIRS.flatMap((p) => [p.fg, p.bg]),
      ...FOCUS_SURFACES,
      '--color-focus',
    ]);

    for (const token of referenced) {
      expect(() => resolve(token, 'light')).not.toThrow();
      expect(() => resolve(token, 'dark')).not.toThrow();
    }
  });

  it('found a meaningful number of light-dark pairs', () => {
    // If the parser silently matched nothing, every test above would vacuously
    // pass. This is the canary for that.
    expect(Object.keys(TOKENS).length).toBeGreaterThanOrEqual(20);
  });
});
