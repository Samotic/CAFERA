import type { Difficulty, Temperature } from '../constants/enums.js';
import type { Id, IsoDateString, Paginated } from './common.js';
import type { Ingredient, Step } from './recipe.js';

/**
 * A user-authored recipe. Deliberately a separate collection from `recipes`:
 * curated content and user content have different validation, moderation and
 * indexing needs, and mixing them would make every public query unsafe by default.
 */
export interface CustomRecipe {
  _id: Id;
  ownerId: Id;
  ownerName: string;
  name: string;
  /** Unique per owner; public recipes are addressable at /my-cafe/custom/[id]. */
  slug: string;
  description: string;
  image: string | null;
  imageSquare: string | null;
  blurDataURL: string | null;
  ingredients: Ingredient[];
  steps: Step[];
  preparationTime: number;
  difficulty: Difficulty;
  temperature: Temperature;
  /** Private recipes are noindex and access-checked server-side on every read. */
  isPublic: boolean;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export type CustomRecipeSummary = Pick<
  CustomRecipe,
  | '_id'
  | 'name'
  | 'slug'
  | 'description'
  | 'image'
  | 'imageSquare'
  | 'blurDataURL'
  | 'preparationTime'
  | 'difficulty'
  | 'temperature'
  | 'isPublic'
  | 'updatedAt'
>;

export interface CustomRecipeInput {
  name: string;
  description: string;
  image?: string | null;
  ingredients: Array<Omit<Ingredient, 'scalable'> & { scalable?: boolean }>;
  steps: Array<Omit<Step, 'order'> & { order?: number }>;
  preparationTime: number;
  difficulty: Difficulty;
  temperature: Temperature;
  isPublic: boolean;
}

export type CustomRecipeListResponse = Paginated<CustomRecipeSummary>;
