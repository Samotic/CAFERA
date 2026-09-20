import { Schema, model, models, type Model } from 'mongoose';
import { ACTIVITY_KINDS, DIFFICULTIES, TEMPERATURES, USER_ROLES } from '@/lib/constants/enums';
import { COFFEE_PREFERENCES } from '@/lib/constants/preferences';
import { REVIEW_MAX_RATING, REVIEW_MIN_RATING } from '@/lib/constants/limits';

/**
 * Every model except Recipe, which is large enough to warrant its own file.
 *
 * The collection set is deliberately small. Recently-viewed, brew history and
 * want-to-try share one `userActivity` collection keyed by `kind`: they have
 * identical access rules and lifetimes, so three collections would buy nothing
 * but three sets of indexes to keep in sync.
 */

/* ---------------------------------------------------------------- Equipment */

export interface EquipmentDoc {
  slug: string;
  name: string;
  description: string;
  icon: string;
}

const equipmentSchema = new Schema<EquipmentDoc>(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    description: { type: String, required: true },
    /* lucide-react icon name, resolved through a vetted allow-list on the
       client — never rendered as arbitrary markup. */
    icon: { type: String, required: true },
  },
  { timestamps: true },
);

export const EquipmentModel: Model<EquipmentDoc> =
  (models.Equipment as Model<EquipmentDoc>) ?? model<EquipmentDoc>('Equipment', equipmentSchema);

/* --------------------------------------------------------------------- User */

export interface UserDoc {
  name: string;
  email: string;
  avatarUrl: string | null;
  role: (typeof USER_ROLES)[number];
  hasOnboarded: boolean;
  preferences: string[];
  settings: {
    theme: string;
    unitSystem: string;
    reducedMotion: boolean | null;
    notifications: { productUpdates: boolean; brewReminders: boolean; newRecipes: boolean };
  };
}

const userSchema = new Schema<UserDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    /* Lowercased on write so the unique index cannot be bypassed with capitals
       — `Sam@x.com` and `sam@x.com` must be one account. */
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    avatarUrl: { type: String, default: null },
    /**
     * Never settable from a request body. Admin is granted out of band; a
     * `role` field that any endpoint accepts is a privilege-escalation bug
     * waiting for someone to find it.
     */
    role: { type: String, enum: USER_ROLES, default: 'user' },
    hasOnboarded: { type: Boolean, default: false },
    preferences: { type: [String], enum: COFFEE_PREFERENCES, default: [] },
    settings: {
      theme: { type: String, default: 'system' },
      unitSystem: { type: String, default: 'metric' },
      reducedMotion: { type: Boolean, default: null },
      notifications: {
        productUpdates: { type: Boolean, default: true },
        brewReminders: { type: Boolean, default: false },
        newRecipes: { type: Boolean, default: true },
      },
    },
  },
  { timestamps: true },
);

export const UserModel: Model<UserDoc> =
  (models.User as Model<UserDoc>) ?? model<UserDoc>('User', userSchema);

/* ---------------------------------------------------------------- Favorite */

export interface FavoriteDoc {
  userId: Schema.Types.ObjectId;
  recipeId: Schema.Types.ObjectId;
}

const favoriteSchema = new Schema<FavoriteDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipeId: { type: Schema.Types.ObjectId, ref: 'Recipe', required: true },
  },
  { timestamps: true },
);

/* Enforced by the database, not by a client check: a double-click that fires
   two requests must not create two favourites. */
favoriteSchema.index({ userId: 1, recipeId: 1 }, { unique: true });
favoriteSchema.index({ userId: 1, createdAt: -1 });

export const FavoriteModel: Model<FavoriteDoc> =
  (models.Favorite as Model<FavoriteDoc>) ?? model<FavoriteDoc>('Favorite', favoriteSchema);

/* ------------------------------------------------------------------ Review */

export interface ReviewDoc {
  userId: Schema.Types.ObjectId;
  recipeId: Schema.Types.ObjectId;
  rating: number;
  body: string | null;
}

const reviewSchema = new Schema<ReviewDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipeId: { type: Schema.Types.ObjectId, ref: 'Recipe', required: true, index: true },
    rating: {
      type: Number,
      required: true,
      min: REVIEW_MIN_RATING,
      max: REVIEW_MAX_RATING,
      validate: { validator: Number.isInteger, message: 'Ratings are whole stars' },
    },
    /* Null rather than '' so "rated but did not write" is a single queryable
       state instead of two that mean the same thing. */
    body: { type: String, default: null, maxlength: 1000 },
  },
  { timestamps: true },
);

/* One review per person per recipe, enforced by the database. A client-side
   check is advice; this is the rule. */
reviewSchema.index({ userId: 1, recipeId: 1 }, { unique: true });
reviewSchema.index({ recipeId: 1, createdAt: -1 });

export const ReviewModel: Model<ReviewDoc> =
  (models.Review as Model<ReviewDoc>) ?? model<ReviewDoc>('Review', reviewSchema);

/* ------------------------------------------------------------ CustomRecipe */

export interface CustomRecipeDoc {
  ownerId: Schema.Types.ObjectId;
  ownerName: string;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  imageSquare: string | null;
  blurDataURL: string | null;
  ingredients: unknown[];
  steps: unknown[];
  preparationTime: number;
  difficulty: string;
  temperature: string;
  isPublic: boolean;
}

const customRecipeSchema = new Schema<CustomRecipeDoc>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    ownerName: { type: String, required: true },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true },
    description: { type: String, required: true, maxlength: 400 },
    image: { type: String, default: null },
    imageSquare: { type: String, default: null },
    blurDataURL: { type: String, default: null },
    ingredients: { type: [Schema.Types.Mixed], required: true },
    steps: { type: [Schema.Types.Mixed], required: true },
    preparationTime: { type: Number, required: true, min: 1 },
    difficulty: { type: String, enum: DIFFICULTIES, required: true },
    temperature: { type: String, enum: TEMPERATURES, required: true },
    /* Private recipes are noindex and access-checked server-side on every read.
       Default false: a recipe someone is still drafting must not be public
       because they forgot to set a flag. */
    isPublic: { type: Boolean, default: false, index: true },
  },
  { timestamps: true },
);

/* Unique per owner, not globally — two people may both write "My Morning Latte". */
customRecipeSchema.index({ ownerId: 1, slug: 1 }, { unique: true });

export const CustomRecipeModel: Model<CustomRecipeDoc> =
  (models.CustomRecipe as Model<CustomRecipeDoc>) ??
  model<CustomRecipeDoc>('CustomRecipe', customRecipeSchema);

/* ------------------------------------------------------------ UserActivity */

export interface UserActivityDoc {
  userId: Schema.Types.ObjectId;
  recipeId: Schema.Types.ObjectId;
  kind: (typeof ACTIVITY_KINDS)[number];
  count: number;
  occurredAt: Date;
}

const userActivitySchema = new Schema<UserActivityDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    recipeId: { type: Schema.Types.ObjectId, ref: 'Recipe', required: true },
    kind: { type: String, enum: ACTIVITY_KINDS, required: true },
    count: { type: Number, default: 1, min: 1 },
    occurredAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

/* One row per user/recipe/kind, upserted. Viewing a recipe twice bumps `count`
   and `occurredAt` rather than growing the collection without bound. */
userActivitySchema.index({ userId: 1, recipeId: 1, kind: 1 }, { unique: true });
userActivitySchema.index({ userId: 1, kind: 1, occurredAt: -1 });

export const UserActivityModel: Model<UserActivityDoc> =
  (models.UserActivity as Model<UserActivityDoc>) ??
  model<UserActivityDoc>('UserActivity', userActivitySchema);

export { RecipeModel } from './Recipe';
