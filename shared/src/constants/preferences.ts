/**
 * Coffee preferences collected during onboarding (step 3) and editable later from
 * /profile/preferences. They personalise the Home rails; they never filter content
 * away, so every recipe stays reachable regardless of what a user picked.
 */

export const COFFEE_PREFERENCES = [
  'hot',
  'cold',
  'strong',
  'mild',
  'sweet',
  'no-sugar',
  'milk-based',
  'black-coffee',
  'espresso',
  'dessert-coffee',
] as const;
export type CoffeePreference = (typeof COFFEE_PREFERENCES)[number];

export const COFFEE_PREFERENCE_LABELS: Readonly<Record<CoffeePreference, string>> = {
  hot: 'Hot',
  cold: 'Cold',
  strong: 'Strong',
  mild: 'Mild',
  sweet: 'Sweet',
  'no-sugar': 'No Sugar',
  'milk-based': 'Milk Based',
  'black-coffee': 'Black Coffee',
  espresso: 'Espresso',
  'dessert-coffee': 'Dessert Coffee',
};

/** A user may pick many, but an unbounded list is a sign of abuse, not of taste. */
export const MAX_COFFEE_PREFERENCES = COFFEE_PREFERENCES.length;
