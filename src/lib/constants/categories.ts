/**
 * Recipe categories (the taxonomy a recipe *belongs* to) and discovery facets
 * (the lenses users browse by). A recipe has exactly one category but can match
 * many facets — an Iced Latte is a `cold-coffee` recipe that also answers to the
 * `cold`, `milk` and `quick` facets.
 */

export const CATEGORIES = [
  'espresso',
  'milk-based',
  'cold-coffee',
  'sweet',
  'strong',
  'classic',
  'specialty',
] as const;
export type Category = (typeof CATEGORIES)[number];

export interface CategoryMeta {
  readonly slug: Category;
  readonly label: string;
  readonly description: string;
}

export const CATEGORY_META: readonly CategoryMeta[] = [
  {
    slug: 'espresso',
    label: 'Espresso',
    description: 'Pure, concentrated shots and the drinks built directly on them.',
  },
  {
    slug: 'milk-based',
    label: 'Milk Based',
    description: 'Steamed milk, microfoam and the art of the pour.',
  },
  {
    slug: 'cold-coffee',
    label: 'Cold Coffee',
    description: 'Iced, chilled and slow-steeped coffee for warm days.',
  },
  {
    slug: 'sweet',
    label: 'Sweet',
    description: 'Syrups, chocolate and dessert-leaning indulgence.',
  },
  {
    slug: 'strong',
    label: 'Strong',
    description: 'High-intensity brews for a serious lift.',
  },
  {
    slug: 'classic',
    label: 'Classic',
    description: 'The timeless cafe menu, done properly.',
  },
  {
    slug: 'specialty',
    label: 'Specialty',
    description: 'Regional traditions and modern third-wave creations.',
  },
];

export const CATEGORY_LABELS = Object.freeze(
  CATEGORY_META.reduce<Record<string, string>>((acc, category) => {
    acc[category.slug] = category.label;
    return acc;
  }, {}),
) as Readonly<Record<Category, string>>;

/**
 * Facets shown as chips on /discover. They map onto concrete query parameters
 * rather than onto the `category` field, so they can combine freely.
 */
export const DISCOVER_FACETS = [
  'hot',
  'cold',
  'espresso',
  'milk',
  'sweet',
  'strong',
  'quick',
  'dessert',
  'international',
] as const;
export type DiscoverFacet = (typeof DISCOVER_FACETS)[number];

export const DISCOVER_FACET_LABELS: Readonly<Record<DiscoverFacet, string>> = {
  hot: 'Hot',
  cold: 'Cold',
  espresso: 'Espresso',
  milk: 'Milk',
  sweet: 'Sweet',
  strong: 'Strong',
  quick: 'Quick',
  dessert: 'Dessert',
  international: 'International',
};

/** Recipes at or under this many minutes qualify as "Quick & Easy". */
export const QUICK_RECIPE_MAX_MINUTES = 10;
