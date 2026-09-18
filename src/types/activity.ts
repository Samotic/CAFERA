import type { ActivityKind } from '@/lib/constants/enums';
import type { Id, IsoDateString, Paginated } from './common';
import type { RecipeSummary } from './recipe';

/**
 * Recently viewed, brew history and want-to-try all share one collection keyed by
 * `kind`. They have identical access rules and lifetimes, so three collections
 * would buy nothing but three sets of indexes to keep in sync.
 */
export interface ActivityEntry {
  _id: Id;
  kind: ActivityKind;
  recipe: RecipeSummary;
  /** How many times this recipe has been viewed or brewed by this user. */
  count: number;
  occurredAt: IsoDateString;
}

export type ActivityListResponse = Paginated<ActivityEntry>;

export interface FavoriteEntry {
  _id: Id;
  recipe: RecipeSummary;
  createdAt: IsoDateString;
}

export type FavoriteListResponse = Paginated<FavoriteEntry>;

export interface FavoriteToggleResponse {
  recipeId: Id;
  isFavorite: boolean;
}

/** Everything /my-cafe needs for its overview cards, in a single request. */
export interface MyCafeOverviewResponse {
  recentlyViewed: RecipeSummary[];
  favorites: RecipeSummary[];
  history: RecipeSummary[];
  wantToTry: RecipeSummary[];
  customRecipes: Array<{ _id: Id; name: string; slug: string; imageSquare: string | null }>;
  counts: {
    recentlyViewed: number;
    favorites: number;
    history: number;
    wantToTry: number;
    customRecipes: number;
  };
}
