/**
 * Domain enumerations.
 *
 * Every enum is declared once as a readonly tuple so it can drive three things at
 * the same time: the TypeScript union, the zod schema, and the Mongoose `enum`
 * validator. Adding a value in one place propagates everywhere.
 */

export const TEMPERATURES = ['hot', 'cold'] as const;
export type Temperature = (typeof TEMPERATURES)[number];

export const DIFFICULTIES = ['easy', 'medium', 'hard'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const STRENGTHS = ['mild', 'medium', 'strong'] as const;
export type Strength = (typeof STRENGTHS)[number];

export const INGREDIENT_UNITS = ['ml', 'g', 'shot', 'tsp', 'tbsp', 'piece', 'pinch'] as const;
export type IngredientUnit = (typeof INGREDIENT_UNITS)[number];

export const USER_ROLES = ['user', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const THEME_PREFERENCES = ['light', 'dark', 'system'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export const UNIT_SYSTEMS = ['metric', 'imperial'] as const;
export type UnitSystem = (typeof UNIT_SYSTEMS)[number];

/** Activity kinds recorded against a user in the single `userActivity` collection. */
export const ACTIVITY_KINDS = ['viewed', 'brewed', 'want-to-try'] as const;
export type ActivityKind = (typeof ACTIVITY_KINDS)[number];

export const RECIPE_SORTS = ['popularity', 'rating', 'time', 'newest', 'name'] as const;
export type RecipeSort = (typeof RECIPE_SORTS)[number];

/** Rendered for humans — difficulty must never be conveyed by colour alone. */
export const DIFFICULTY_LABELS: Readonly<Record<Difficulty, string>> = {
  easy: 'Easy',
  medium: 'Medium',
  hard: 'Hard',
};

export const STRENGTH_LABELS: Readonly<Record<Strength, string>> = {
  mild: 'Mild',
  medium: 'Medium Strength',
  strong: 'Strong',
};

export const TEMPERATURE_LABELS: Readonly<Record<Temperature, string>> = {
  hot: 'Hot',
  cold: 'Cold',
};

export const UNIT_LABELS: Readonly<Record<IngredientUnit, string>> = {
  ml: 'ml',
  g: 'g',
  shot: 'shot',
  tsp: 'tsp',
  tbsp: 'tbsp',
  piece: 'piece',
  pinch: 'pinch',
};
