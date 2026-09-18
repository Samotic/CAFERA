/**
 * @cafera/shared — the single source of truth for everything both halves of
 * CAFERA must agree on: domain vocabulary, wire types, and the zod contracts that
 * validate requests on the client and are re-enforced on the server.
 *
 * Nothing environment-specific belongs here. No `window`, no `process.env`, no
 * database driver — this module is imported by a browser bundle and a Node
 * process alike.
 */

// Constants
export * from './constants/enums.js';
export * from './constants/categories.js';
export * from './constants/preferences.js';
export * from './constants/limits.js';

// Types
export * from './types/common.js';
export * from './types/recipe.js';
export * from './types/user.js';
export * from './types/auth.js';
export * from './types/review.js';
export * from './types/custom-recipe.js';
export * from './types/activity.js';

// Schemas
export * from './schemas/common.js';
export * from './schemas/auth.js';
export * from './schemas/user.js';
export * from './schemas/recipe.js';
export * from './schemas/review.js';
export * from './schemas/custom-recipe.js';
export * from './schemas/ai.js';

// Utils
export * from './utils/scale.js';
export * from './utils/units.js';
export * from './utils/password.js';
export * from './utils/slug.js';
export * from './utils/daily.js';
