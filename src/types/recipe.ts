import type { Category } from '@/lib/constants/categories';
import type {
  Difficulty,
  IngredientUnit,
  Strength,
  Temperature,
  RecipeSort,
} from '@/lib/constants/enums';
import type { Id, IsoDateString, Paginated } from './common';

export interface Ingredient {
  name: string;
  amount: number;
  unit: IngredientUnit;
  optional?: boolean;
  /**
   * `false` for quantities that do not multiply sensibly — a pinch of cinnamon is
   * a pinch whether you brew one cup or three.
   */
  scalable: boolean;
  /** Free-text nuance shown after the name, e.g. "whole, cold" for milk. */
  note?: string;
}

export interface Step {
  order: number;
  instruction: string;
  image?: string;
  /** Drives the Brew Mode timer. Steps without a duration show no countdown. */
  durationSeconds?: number;
}

/** A recipe references equipment by slug; the documents live in their own collection. */
export interface EquipmentRef {
  slug: string;
  name: string;
  optional?: boolean;
}

export interface Equipment {
  _id: Id;
  slug: string;
  name: string;
  description: string;
  /** lucide-react icon name, resolved through a vetted allow-list on the client. */
  icon: string;
}

export interface Recipe {
  _id: Id;
  name: string;
  /** Unique and indexed — this is the public URL segment. */
  slug: string;
  description: string;
  /** 16:9 crop, used for heroes and the featured card. */
  image: string;
  /** 1:1 crop, used for grid and carousel cards. */
  imageSquare: string;
  /** Tiny base64 LQIP handed to next/image so nothing shifts on load. */
  blurDataURL: string;
  category: Category;
  origin?: string;
  temperature: Temperature;
  difficulty: Difficulty;
  /** Minutes. */
  preparationTime: number;
  strength: Strength;
  /** Denormalised average, 0-5, recomputed atomically whenever a review changes. */
  rating: number;
  reviewCount: number;
  ingredients: Ingredient[];
  equipment: EquipmentRef[];
  steps: Step[];
  calories?: number;
  /** Milligrams. */
  caffeine?: number;
  tags: string[];
  containsMilk: boolean;
  isSweet: boolean;
  /** Drives the "Popular Today" rail; incremented on detail views. */
  popularity: number;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

/**
 * The shape returned by list endpoints. Cards never need ingredients, steps or
 * equipment, and shipping them would triple the payload of a 24-item grid.
 */
export type RecipeSummary = Pick<
  Recipe,
  | '_id'
  | 'name'
  | 'slug'
  | 'description'
  | 'image'
  | 'imageSquare'
  | 'blurDataURL'
  | 'category'
  | 'origin'
  | 'temperature'
  | 'difficulty'
  | 'preparationTime'
  | 'strength'
  | 'rating'
  | 'reviewCount'
  | 'tags'
  | 'containsMilk'
  | 'isSweet'
>;

/** Query contract for GET /api/recipes — mirrors the URL search params exactly. */
export interface RecipeListQuery {
  category?: Category;
  temperature?: Temperature;
  difficulty?: Difficulty;
  strength?: Strength;
  /** Minutes; inclusive upper bound. */
  maxTime?: number;
  minTime?: number;
  milk?: boolean;
  sweet?: boolean;
  origin?: string;
  tag?: string;
  q?: string;
  sort?: RecipeSort;
  page?: number;
  limit?: number;
}

export type RecipeListResponse = Paginated<RecipeSummary>;

export interface RecipeSearchResponse {
  query: string;
  recipes: RecipeSummary[];
  categories: Category[];
  ingredients: string[];
}

/** Home page payload — one request instead of four so the shell paints once. */
export interface HomeFeedResponse {
  coffeeOfTheDay: RecipeSummary | null;
  popularToday: RecipeSummary[];
  quickAndEasy: RecipeSummary[];
  exploreTheWorld: Array<{ origin: string; recipes: RecipeSummary[] }>;
}
