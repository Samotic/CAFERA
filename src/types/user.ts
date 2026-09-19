import type { CoffeePreference } from '@/lib/constants/preferences';
import type { ThemePreference, UnitSystem, UserRole } from '@/lib/constants/enums';
import type { Id, IsoDateString } from './common';

export interface UserSettings {
  theme: ThemePreference;
  unitSystem: UnitSystem;
  /** User override for OS-level reduced motion; `null` means "follow the system". */
  reducedMotion: boolean | null;
  notifications: {
    productUpdates: boolean;
    brewReminders: boolean;
    newRecipes: boolean;
  };
}

/**
 * The user as the client sees it. The password hash, refresh-token family and any
 * other credential material never appear in this shape — not even for admins.
 */
export interface PublicUser {
  _id: Id;
  name: string;
  email: string;
  avatarUrl: string | null;
  role: UserRole;
  /** Server-side source of truth; localStorage only mirrors it for instant paint. */
  hasOnboarded: boolean;
  preferences: CoffeePreference[];
  settings: UserSettings;
  createdAt: IsoDateString;
  updatedAt: IsoDateString;
}

export interface UserStats {
  recipesTried: number;
  favoritesCount: number;
  customRecipesCount: number;
  reviewsCount: number;
  /** Consecutive days with at least one completed brew, counting back from today. */
  brewingStreak: number;
  longestStreak: number;
  lastBrewedAt: IsoDateString | null;
}

export interface ProfileResponse {
  user: PublicUser;
  stats: UserStats;
}
