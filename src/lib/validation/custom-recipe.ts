import { z } from 'zod';
import { DIFFICULTIES, TEMPERATURES } from '../constants/enums';
import {
  RECIPE_DESCRIPTION_MAX_LENGTH,
  RECIPE_MAX_INGREDIENTS,
  RECIPE_MAX_STEPS,
  RECIPE_NAME_MAX_LENGTH,
  STEP_INSTRUCTION_MAX_LENGTH,
} from '../constants/limits';
import { multilineString, trimmedString } from './common';
import { ingredientSchema } from './recipe';

/**
 * User-authored recipes.
 *
 * `order` is deliberately absent from the step input: the client sends steps in
 * the order the user arranged them and the server numbers them. Accepting a
 * client-supplied order invites duplicate and missing indexes that would break
 * Brew Mode navigation.
 */
export const customStepInputSchema = z.object({
  instruction: multilineString(3, STEP_INSTRUCTION_MAX_LENGTH, 'Instruction'),
  durationSeconds: z
    .number()
    .int()
    .min(1)
    .max(60 * 60 * 6)
    .optional(),
});

export const customRecipeInputSchema = z.object({
  name: trimmedString(2, RECIPE_NAME_MAX_LENGTH, 'Recipe name'),
  description: multilineString(10, RECIPE_DESCRIPTION_MAX_LENGTH, 'Description'),
  /** A Cloudinary URL produced by the signed upload flow, or nothing at all. */
  image: z.union([z.url('That image link is not valid'), z.literal(''), z.null()]).optional(),
  ingredients: z
    .array(ingredientSchema)
    .min(1, 'Add at least one ingredient')
    .max(RECIPE_MAX_INGREDIENTS, `Recipes are limited to ${RECIPE_MAX_INGREDIENTS} ingredients`),
  steps: z
    .array(customStepInputSchema)
    .min(1, 'Add at least one step')
    .max(RECIPE_MAX_STEPS, `Recipes are limited to ${RECIPE_MAX_STEPS} steps`),
  preparationTime: z.coerce
    .number()
    .int('Use whole minutes')
    .min(1, 'Preparation time must be at least 1 minute')
    .max(2880, 'That is longer than two days'),
  difficulty: z.enum(DIFFICULTIES),
  temperature: z.enum(TEMPERATURES),
  isPublic: z.boolean().default(false),
});
export type CustomRecipeInputSchema = z.infer<typeof customRecipeInputSchema>;

export const customRecipeUpdateSchema = customRecipeInputSchema.partial();
export type CustomRecipeUpdateInput = z.infer<typeof customRecipeUpdateSchema>;
