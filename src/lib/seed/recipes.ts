import type { Recipe } from '@/types/recipe';
import type { Category } from '@/lib/constants/categories';
import type { Difficulty, Strength, Temperature } from '@/lib/constants/enums';
import { slugify } from '@/lib/utils/slug';
import { GENERATED_RECIPE_IMAGES, type RecipeImageSet } from './recipe-images.generated';

/* The Unsplash fallback array that used to live here is gone with the rest of
   the remote imagery. Every photograph is now a committed local asset, so there
   is nothing to fall back *to* — and a fallback that silently substitutes an
   unrelated cup is worse than a build failure. */

type RecipeSeed = Pick<
  Recipe,
  | 'name'
  | 'slug'
  | 'description'
  | 'category'
  | 'temperature'
  | 'difficulty'
  | 'preparationTime'
  | 'strength'
  | 'origin'
  | 'tags'
  | 'containsMilk'
  | 'isSweet'
  | 'ingredients'
  | 'equipment'
  | 'steps'
>;

type SeedRow = [
  string,
  Category,
  Temperature,
  Difficulty,
  number,
  Strength,
  string,
  string[],
  boolean,
  boolean,
];

const baseSteps = (name: string, durationSeconds = 45) => [
  {
    order: 1,
    instruction: `Prepare your coffee and equipment for the ${name}.`,
    durationSeconds: 30,
  },
  {
    order: 2,
    instruction: 'Brew slowly, keeping the flow steady and the temperature consistent.',
    durationSeconds,
  },
  { order: 3, instruction: 'Taste, adjust if needed, and serve immediately.' },
];

const coffee = (amount = 18) => ({ name: 'Coffee', amount, unit: 'g' as const, scalable: true });
const water = (amount = 240) => ({ name: 'Water', amount, unit: 'ml' as const, scalable: true });

const seedRows: SeedRow[] = [
  [
    'Espresso',
    'espresso',
    'hot',
    'easy',
    2,
    'strong',
    'Italy',
    ['espresso', 'quick'],
    false,
    false,
  ],
  [
    'Ristretto',
    'espresso',
    'hot',
    'medium',
    3,
    'strong',
    'Italy',
    ['espresso', 'intense'],
    false,
    false,
  ],
  ['Lungo', 'espresso', 'hot', 'easy', 4, 'strong', 'Italy', ['espresso', 'quick'], false, false],
  [
    'Americano',
    'classic',
    'hot',
    'easy',
    5,
    'medium',
    'United States',
    ['espresso', 'quick'],
    false,
    false,
  ],
  [
    'Long Black',
    'strong',
    'hot',
    'easy',
    5,
    'strong',
    'Australia',
    ['espresso', 'quick'],
    false,
    false,
  ],
  [
    'Cappuccino',
    'milk-based',
    'hot',
    'medium',
    8,
    'medium',
    'Italy',
    ['espresso', 'milk'],
    true,
    false,
  ],
  [
    'Flat White',
    'milk-based',
    'hot',
    'medium',
    7,
    'strong',
    'Australia',
    ['espresso', 'milk'],
    true,
    false,
  ],
  [
    'Café Latte',
    'milk-based',
    'hot',
    'easy',
    8,
    'mild',
    'Italy',
    ['espresso', 'milk'],
    true,
    false,
  ],
  [
    'Cortado',
    'milk-based',
    'hot',
    'medium',
    6,
    'strong',
    'Spain',
    ['espresso', 'milk', 'quick'],
    true,
    false,
  ],
  [
    'Mocha',
    'sweet',
    'hot',
    'medium',
    10,
    'medium',
    'United States',
    ['espresso', 'milk', 'chocolate', 'dessert'],
    true,
    true,
  ],
  [
    'Macchiato',
    'milk-based',
    'hot',
    'easy',
    5,
    'strong',
    'Italy',
    ['espresso', 'milk', 'quick'],
    true,
    false,
  ],
  ['Affogato', 'sweet', 'cold', 'easy', 5, 'medium', 'Italy', ['espresso', 'dessert'], true, true],
  [
    'Iced Latte',
    'cold-coffee',
    'cold',
    'easy',
    6,
    'medium',
    'United States',
    ['espresso', 'milk', 'cold', 'quick'],
    true,
    false,
  ],
  [
    'Cold Brew',
    'cold-coffee',
    'cold',
    'easy',
    720,
    'mild',
    'United States',
    ['cold', 'slow'],
    false,
    false,
  ],
  [
    'Cold Brew Tonic',
    'cold-coffee',
    'cold',
    'easy',
    725,
    'medium',
    'Sweden',
    ['cold', 'bright', 'international'],
    false,
    false,
  ],
  [
    'Vietnamese Iced Coffee',
    'sweet',
    'cold',
    'easy',
    8,
    'strong',
    'Vietnam',
    ['cold', 'milk', 'sweet', 'international'],
    true,
    true,
  ],
  [
    'Dalgona Coffee',
    'sweet',
    'cold',
    'medium',
    12,
    'medium',
    'South Korea',
    ['cold', 'milk', 'sweet', 'dessert'],
    true,
    true,
  ],
  [
    'Frappé',
    'cold-coffee',
    'cold',
    'easy',
    8,
    'mild',
    'Greece',
    ['cold', 'milk', 'sweet', 'international'],
    true,
    true,
  ],
  [
    'French Press',
    'classic',
    'hot',
    'easy',
    6,
    'medium',
    'France',
    ['classic', 'quick'],
    false,
    false,
  ],
  [
    'V60 Pour Over',
    'specialty',
    'hot',
    'hard',
    8,
    'mild',
    'Japan',
    ['filter', 'specialty', 'international'],
    false,
    false,
  ],
  [
    'Chemex',
    'specialty',
    'hot',
    'medium',
    10,
    'mild',
    'United States',
    ['filter', 'specialty'],
    false,
    false,
  ],
  [
    'Turkish Coffee',
    'specialty',
    'hot',
    'medium',
    12,
    'strong',
    'Türkiye',
    ['strong', 'international'],
    false,
    true,
  ],
  [
    'Café de Olla',
    'sweet',
    'hot',
    'medium',
    18,
    'strong',
    'Mexico',
    ['sweet', 'international'],
    false,
    true,
  ],
  [
    'Vietnamese Egg Coffee',
    'sweet',
    'hot',
    'hard',
    15,
    'strong',
    'Vietnam',
    ['milk', 'sweet', 'dessert', 'international'],
    true,
    true,
  ],
  [
    'Irish Coffee',
    'specialty',
    'hot',
    'medium',
    10,
    'strong',
    'Ireland',
    ['sweet', 'dessert', 'international'],
    true,
    true,
  ],
];

const seeds: RecipeSeed[] = seedRows.map(
  ([
    name,
    category,
    temperature,
    difficulty,
    preparationTime,
    strength,
    origin,
    tags,
    containsMilk,
    isSweet,
  ]) =>
    ({
      name,
      /* The shared slugify, not a local regex. An inline
         `.replace(/[^a-z0-9]+/g, '-')` drops diacritics entirely rather than
         folding them: "Café Latte" became `caf-latte`, "Frappé" became `frapp`.
         Those slugs matched no image and no canonical URL, and the old remote
         fallback hid it by serving an unrelated photograph. */
      slug: slugify(name),
      description: `A carefully balanced ${name.toLowerCase()} with a clear method, honest ratios, and room to make it yours.`,
      category,
      temperature,
      difficulty,
      preparationTime,
      strength,
      origin,
      tags,
      containsMilk,
      isSweet,
      ingredients: [coffee(), water()],
      equipment: [
        { slug: 'kettle', name: 'Kettle' },
        { slug: 'scale', name: 'Kitchen scale', optional: true },
      ],
      steps: baseSteps(name, Math.min(90, Math.max(30, preparationTime * 8))),
    }) as RecipeSeed,
);

/**
 * Image set for a slug.
 *
 * Throws rather than falling back. A recipe whose photography is missing is a
 * content bug that should stop the build, not one that ships a plausible-looking
 * wrong picture and is noticed months later by a reader who knows what a cortado
 * is meant to look like.
 */
function recipeImages(slug: string): RecipeImageSet {
  const set = GENERATED_RECIPE_IMAGES[slug];
  if (!set) {
    throw new Error(
      `No imagery for recipe "${slug}". Run \`npm run images:build\` to regenerate public/images/coffee/.`,
    );
  }
  return set;
}

export const RECIPE_SEED: Recipe[] = seeds.map((recipe, index) => ({
  ...recipe,
  /**
   * Local, committed assets. The two crops are generated independently from the
   * source rather than derived from each other — a square letterboxed out of a
   * 16:9 would show bars on a grid card, and one centre-cropped from it would
   * cut the cup in half as often as not.
   *
   * There is no remote fallback on purpose. A missing entry here should fail the
   * build (see `assertRecipeImagesExist`), not silently show the wrong drink.
   */
  image: recipeImages(recipe.slug).image,
  imageSquare: recipeImages(recipe.slug).imageSquare,
  blurDataURL: recipeImages(recipe.slug).blurDataURL,
  rating: 4.2 + ((index * 7) % 8) / 10,
  reviewCount: 18 + index * 7,
  popularity: 100 - index,
  calories: recipe.isSweet ? 180 : recipe.containsMilk ? 110 : 8,
  caffeine: recipe.strength === 'strong' ? 95 : 75,
  _id: `seed-${index + 1}`,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}));
