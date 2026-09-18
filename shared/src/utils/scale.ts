import type { IngredientUnit } from '../constants/enums.js';
import { MAX_SERVINGS, MIN_SERVINGS } from '../constants/limits.js';
import type { Ingredient } from '../types/recipe.js';

/**
 * Ingredient scaling.
 *
 * Multiplying an amount is the easy half. The half that matters is rounding the
 * result to something a person can actually measure: `0.5 shot` is a real
 * instruction, `0.5333 shot` is noise. Each unit therefore has its own rounding
 * granularity, and non-scalable ingredients (a pinch of salt) pass through
 * untouched no matter how many servings are requested.
 */

/** Smallest meaningful increment for each unit, in that unit. */
const ROUNDING_INCREMENT: Readonly<Record<IngredientUnit, number>> = {
  ml: 5,
  g: 1,
  shot: 0.5,
  tsp: 0.25,
  tbsp: 0.25,
  piece: 1,
  pinch: 1,
};

/** Below this value, volumes are too small for a 5 ml increment to be honest. */
const FINE_GRAIN_THRESHOLD_ML = 20;

function roundToIncrement(value: number, increment: number): number {
  if (increment <= 0) return value;
  const rounded = Math.round(value / increment) * increment;
  // Multiplying by a fractional increment reintroduces float noise (0.30000000004).
  return Number(rounded.toFixed(4));
}

export function clampServings(servings: number): number {
  if (!Number.isFinite(servings)) return MIN_SERVINGS;
  return Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, Math.round(servings)));
}

/**
 * Scale a single amount for the given serving count and round it to a measurable
 * value. Non-finite or negative input collapses to the original amount rather
 * than propagating NaN into the UI.
 */
export function scaleAmount(amount: number, unit: IngredientUnit, servings: number): number {
  if (!Number.isFinite(amount) || amount <= 0) return amount;
  const factor = clampServings(servings);
  const raw = amount * factor;

  const increment = unit === 'ml' && raw < FINE_GRAIN_THRESHOLD_ML ? 1 : ROUNDING_INCREMENT[unit];
  const rounded = roundToIncrement(raw, increment);

  // Rounding must never erase an ingredient that was genuinely called for.
  return rounded > 0 ? rounded : increment;
}

export function scaleIngredient(ingredient: Ingredient, servings: number): Ingredient {
  if (!ingredient.scalable) return ingredient;
  return { ...ingredient, amount: scaleAmount(ingredient.amount, ingredient.unit, servings) };
}

export function scaleIngredients(ingredients: Ingredient[], servings: number): Ingredient[] {
  return ingredients.map((ingredient) => scaleIngredient(ingredient, servings));
}

/**
 * Render an amount without trailing zeros, and with the common kitchen fractions
 * spelled out — `1/2 shot` reads better than `0.5 shot` on a recipe card.
 */
const FRACTION_GLYPHS: ReadonlyArray<readonly [number, string]> = [
  [0.25, '1/4'],
  [0.5, '1/2'],
  [0.75, '3/4'],
];

export function formatAmount(amount: number): string {
  if (!Number.isFinite(amount)) return '';
  if (Number.isInteger(amount)) return String(amount);

  const whole = Math.floor(amount);
  const fraction = Number((amount - whole).toFixed(4));
  const glyph = FRACTION_GLYPHS.find(([value]) => value === fraction)?.[1];

  if (glyph) return whole > 0 ? `${whole} ${glyph}` : glyph;
  return String(Number(amount.toFixed(2)));
}
