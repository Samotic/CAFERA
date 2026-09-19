import { describe, expect, it } from 'vitest';
import { clampServings, formatAmount, scaleAmount, scaleIngredients } from '@/lib/utils/scale';
import { formatMinutes, formatTimer, toDisplayAmount, toIsoDuration } from '@/lib/utils/units';
import type { Ingredient } from '@/types/recipe';

/**
 * Ingredient scaling is the piece of maths a user checks against reality with a
 * scale and a jug in their hand, so it gets the most thorough coverage in the
 * codebase. The rounding rules matter as much as the multiplication: an amount
 * nobody can measure is a wrong answer even when the arithmetic is right.
 */

describe('scaleAmount', () => {
  it('multiplies by the serving count', () => {
    expect(scaleAmount(120, 'ml', 2)).toBe(240);
    expect(scaleAmount(18, 'g', 3)).toBe(54);
  });

  it('rounds shots to the nearest half, never to an unpourable fraction', () => {
    // 1 shot across 3 servings is 3 — but the interesting case is a fractional
    // base amount, which must land on something a barista can actually pull.
    expect(scaleAmount(0.5, 'shot', 3)).toBe(1.5);
    expect(scaleAmount(1, 'shot', 1)).toBe(1);
  });

  it('rounds volumes to 5 ml once they are large enough to matter', () => {
    // 33 x 2 = 66, which rounds to 65 rather than asking for 66 ml of milk.
    expect(scaleAmount(33, 'ml', 2)).toBe(65);
  });

  it('keeps 1 ml precision for small volumes where 5 ml would distort the ratio', () => {
    // 7 x 2 = 14: rounding this to 15 would be a 7% error on a syrup measure.
    expect(scaleAmount(7, 'ml', 2)).toBe(14);
  });

  it('rounds teaspoons to quarters', () => {
    expect(scaleAmount(0.5, 'tsp', 3)).toBe(1.5);
    expect(scaleAmount(0.3, 'tsp', 2)).toBe(0.5);
  });

  it('never rounds an ingredient away to nothing', () => {
    // A tiny amount scaled down must still ask for the smallest usable measure,
    // not for zero — dropping an ingredient silently changes the recipe.
    expect(scaleAmount(0.1, 'ml', 1)).toBeGreaterThan(0);
    expect(scaleAmount(0.2, 'g', 1)).toBeGreaterThan(0);
  });

  it('passes non-finite and non-positive input through untouched', () => {
    expect(scaleAmount(Number.NaN, 'ml', 2)).toBeNaN();
    expect(scaleAmount(0, 'ml', 2)).toBe(0);
  });

  it('produces no floating-point noise', () => {
    // 0.1 * 3 is 0.30000000000000004 in IEEE 754; the UI must never show that.
    const result = scaleAmount(0.25, 'tsp', 3);
    expect(String(result)).not.toMatch(/\d{6,}/);
  });
});

describe('clampServings', () => {
  it('holds the value inside the supported range', () => {
    expect(clampServings(0)).toBe(1);
    expect(clampServings(99)).toBe(6);
    expect(clampServings(2.4)).toBe(2);
    expect(clampServings(Number.NaN)).toBe(1);
  });
});

describe('scaleIngredients', () => {
  const ingredients: Ingredient[] = [
    { name: 'Espresso', amount: 1, unit: 'shot', scalable: true },
    { name: 'Milk', amount: 120, unit: 'ml', scalable: true },
    { name: 'Cinnamon', amount: 1, unit: 'pinch', scalable: false, optional: true },
  ];

  it('scales scalable ingredients and leaves the rest alone', () => {
    const result = scaleIngredients(ingredients, 2);

    expect(result[0]?.amount).toBe(2);
    expect(result[1]?.amount).toBe(240);
    // A pinch is a pinch whether you make one cup or three.
    expect(result[2]?.amount).toBe(1);
  });

  it('does not mutate the input', () => {
    scaleIngredients(ingredients, 3);
    expect(ingredients[1]?.amount).toBe(120);
  });
});

describe('formatAmount', () => {
  it('writes kitchen fractions rather than decimals', () => {
    expect(formatAmount(0.5)).toBe('1/2');
    expect(formatAmount(1.5)).toBe('1 1/2');
    expect(formatAmount(0.25)).toBe('1/4');
    expect(formatAmount(2)).toBe('2');
  });

  it('falls back to a short decimal for amounts with no common fraction', () => {
    expect(formatAmount(1.3)).toBe('1.3');
  });
});

describe('unit conversion', () => {
  it('converts volume and mass for imperial display only', () => {
    expect(toDisplayAmount(120, 'ml', 'metric').text).toBe('120 ml');
    expect(toDisplayAmount(120, 'ml', 'imperial').unit).toBe('fl oz');
    expect(toDisplayAmount(28, 'g', 'imperial').unit).toBe('oz');
  });

  it('leaves system-neutral units unconverted', () => {
    // There is no imperial equivalent of "a shot" or "a pinch".
    expect(toDisplayAmount(1, 'shot', 'imperial').unit).toBe('shot');
    expect(toDisplayAmount(1, 'pinch', 'imperial').unit).toBe('pinch');
  });
});

describe('time formatting', () => {
  it('formats minutes for humans', () => {
    expect(formatMinutes(10)).toBe('10 min');
    expect(formatMinutes(60)).toBe('1 hr');
    expect(formatMinutes(90)).toBe('1 hr 30 min');
  });

  it('emits ISO-8601 durations for schema.org structured data', () => {
    // Google rejects Recipe markup whose totalTime is not a valid ISO duration.
    expect(toIsoDuration(10)).toBe('PT10M');
    expect(toIsoDuration(60)).toBe('PT1H');
    expect(toIsoDuration(90)).toBe('PT1H30M');
    expect(toIsoDuration(720)).toBe('PT12H');
  });

  it('formats the brew timer as MM:SS', () => {
    expect(formatTimer(30)).toBe('00:30');
    expect(formatTimer(605)).toBe('10:05');
    expect(formatTimer(-5)).toBe('00:00');
  });
});
