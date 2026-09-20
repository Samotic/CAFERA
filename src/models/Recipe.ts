import { Schema, model, models, type Model } from 'mongoose';
import { CATEGORIES } from '@/lib/constants/categories';
import { DIFFICULTIES, INGREDIENT_UNITS, STRENGTHS, TEMPERATURES } from '@/lib/constants/enums';
import type { Recipe } from '@/types/recipe';

/**
 * Curated recipes — the content CAFERA ships with.
 *
 * Deliberately a separate collection from user-authored `customRecipes`: the two
 * have different validation, moderation and indexing needs, and mixing them
 * would make every public query unsafe by default (a public listing would have
 * to remember to exclude private user content, and one forgotten filter leaks
 * it).
 */

const ingredientSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    amount: { type: Number, required: true, min: 0 },
    unit: { type: String, required: true, enum: INGREDIENT_UNITS },
    optional: { type: Boolean, default: false },
    /* `false` for quantities that do not multiply sensibly — a pinch of
       cinnamon is a pinch whether you brew one cup or three. */
    scalable: { type: Boolean, default: true },
    note: { type: String, trim: true, maxlength: 120 },
  },
  { _id: false },
);

const stepSchema = new Schema(
  {
    order: { type: Number, required: true, min: 1 },
    instruction: { type: String, required: true, trim: true, maxlength: 500 },
    image: { type: String },
    /* Drives the Brew Mode timer. Steps without a duration show no countdown. */
    durationSeconds: { type: Number, min: 1 },
  },
  { _id: false },
);

const equipmentRefSchema = new Schema(
  {
    slug: { type: String, required: true },
    name: { type: String, required: true },
    optional: { type: Boolean, default: false },
  },
  { _id: false },
);

const recipeSchema = new Schema<Recipe>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 400 },

    image: { type: String, required: true },
    imageSquare: { type: String, required: true },
    blurDataURL: { type: String, default: '' },

    category: { type: String, required: true, enum: CATEGORIES },
    origin: { type: String, trim: true },
    temperature: { type: String, required: true, enum: TEMPERATURES },
    difficulty: { type: String, required: true, enum: DIFFICULTIES },
    preparationTime: { type: Number, required: true, min: 1 },
    strength: { type: String, required: true, enum: STRENGTHS },

    /* Denormalised so a card can render a rating without a second query.
       Recomputed atomically whenever a review is written. */
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewCount: { type: Number, default: 0, min: 0 },
    popularity: { type: Number, default: 0, min: 0 },

    ingredients: { type: [ingredientSchema], required: true },
    equipment: { type: [equipmentRefSchema], default: [] },
    steps: { type: [stepSchema], required: true },

    calories: { type: Number, min: 0 },
    caffeine: { type: Number, min: 0 },
    tags: { type: [String], default: [], index: true },

    /* Denormalised from the ingredients so the Discover filters are one indexed
       comparison rather than a scan through every ingredient array. */
    containsMilk: { type: Boolean, required: true, index: true },
    isSweet: { type: Boolean, required: true, index: true },
  },
  { timestamps: true },
);

/* Compound index matching the most common Discover query shape: filter by
   category and temperature, then sort. A single-field index on each would make
   Mongo pick one and scan the rest. */
recipeSchema.index({ category: 1, temperature: 1, preparationTime: 1 });
recipeSchema.index({ difficulty: 1, strength: 1 });
recipeSchema.index({ popularity: -1 });
recipeSchema.index({ rating: -1 });

/* Text index for search across the fields a person actually types: the drink,
   what is in it, and where it comes from. Weighted so a name match outranks an
   incidental mention in the description. */
recipeSchema.index(
  { name: 'text', description: 'text', tags: 'text', 'ingredients.name': 'text', origin: 'text' },
  {
    weights: { name: 10, tags: 5, 'ingredients.name': 4, origin: 3, description: 1 },
    name: 'recipe_search',
  },
);

export const RecipeModel: Model<Recipe> =
  (models.Recipe as Model<Recipe>) ?? model<Recipe>('Recipe', recipeSchema);
