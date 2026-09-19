import { z } from 'zod';
import { CATEGORIES } from '../constants/categories';
import {
  DIFFICULTIES,
  INGREDIENT_UNITS,
  RECIPE_SORTS,
  STRENGTHS,
  TEMPERATURES,
} from '../constants/enums';
import {
  RECIPE_DESCRIPTION_MAX_LENGTH,
  RECIPE_MAX_INGREDIENTS,
  RECIPE_MAX_STEPS,
  RECIPE_NAME_MAX_LENGTH,
  SEARCH_QUERY_MAX_LENGTH,
  STEP_INSTRUCTION_MAX_LENGTH,
} from '../constants/limits';
import {
  booleanParamSchema,
  multilineString,
  paginationQuerySchema,
  slugSchema,
  trimmedString,
} from './common';

export const ingredientSchema = z.object({
  name: trimmedString(1, 80, 'Ingredient name'),
  amount: z.number().min(0).max(10_000),
  unit: z.enum(INGREDIENT_UNITS),
  optional: z.boolean().optional(),
  scalable: z.boolean().default(true),
  note: trimmedString(1, 120, 'Note').optional(),
});

export const stepSchema = z.object({
  order: z.number().int().min(1).max(RECIPE_MAX_STEPS),
  instruction: multilineString(3, STEP_INSTRUCTION_MAX_LENGTH, 'Instruction'),
  image: z.string().max(500).optional(),
  durationSeconds: z
    .number()
    .int()
    .min(1)
    .max(60 * 60 * 24)
    .optional(),
});

export const equipmentRefSchema = z.object({
  slug: slugSchema,
  name: trimmedString(1, 60, 'Equipment name'),
  optional: z.boolean().optional(),
});

/**
 * Admin-authored recipe payload. Not reachable by normal users — `requireRole`
 * gates every route that accepts it — but validated just as strictly, because an
 * admin account is the most valuable thing an attacker can take.
 */
export const recipeInputSchema = z.object({
  name: trimmedString(2, RECIPE_NAME_MAX_LENGTH, 'Name'),
  slug: slugSchema,
  description: multilineString(10, RECIPE_DESCRIPTION_MAX_LENGTH, 'Description'),
  image: z.string().min(1).max(500),
  imageSquare: z.string().min(1).max(500),
  blurDataURL: z.string().max(4000).default(''),
  category: z.enum(CATEGORIES),
  origin: trimmedString(2, 60, 'Origin').optional(),
  temperature: z.enum(TEMPERATURES),
  difficulty: z.enum(DIFFICULTIES),
  preparationTime: z.number().int().min(1).max(2880),
  strength: z.enum(STRENGTHS),
  ingredients: z.array(ingredientSchema).min(1).max(RECIPE_MAX_INGREDIENTS),
  equipment: z.array(equipmentRefSchema).max(15).default([]),
  steps: z.array(stepSchema).min(1).max(RECIPE_MAX_STEPS),
  calories: z.number().int().min(0).max(5000).optional(),
  caffeine: z.number().int().min(0).max(1000).optional(),
  tags: z
    .array(trimmedString(1, 30, 'Tag'))
    .max(20)
    .default([]),
  containsMilk: z.boolean(),
  isSweet: z.boolean(),
});
export type RecipeInput = z.infer<typeof recipeInputSchema>;

export const recipeUpdateSchema = recipeInputSchema.partial();
export type RecipeUpdateInput = z.infer<typeof recipeUpdateSchema>;

/**
 * GET /api/recipes. Every field is optional and coerced, because this schema also
 * parses URL search params that users can hand-edit, bookmark and share. Junk in a
 * shared link should narrow the results, never produce an error page.
 */
export const recipeListQuerySchema = paginationQuerySchema.extend({
  category: z.enum(CATEGORIES).optional(),
  temperature: z.enum(TEMPERATURES).optional(),
  difficulty: z.enum(DIFFICULTIES).optional(),
  strength: z.enum(STRENGTHS).optional(),
  maxTime: z.coerce.number().int().min(1).max(2880).optional(),
  minTime: z.coerce.number().int().min(0).max(2880).optional(),
  milk: booleanParamSchema.optional(),
  sweet: booleanParamSchema.optional(),
  origin: z.string().trim().max(60).optional(),
  tag: z.string().trim().max(30).optional(),
  q: z.string().trim().max(SEARCH_QUERY_MAX_LENGTH).optional(),
  sort: z.enum(RECIPE_SORTS).default('popularity'),
});
export type RecipeListQueryInput = z.infer<typeof recipeListQuerySchema>;

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, 'Enter something to search for').max(SEARCH_QUERY_MAX_LENGTH),
  limit: z.coerce.number().int().min(1).max(20).default(8),
});
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
