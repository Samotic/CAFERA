import { notFound } from 'next/navigation';
import { BrewMode } from '@/components/recipe/BrewMode';
import { RECIPE_SEED } from '@/lib/seed/recipes';

/**
 * Unknown slugs are a 404, not a render. See the note on the recipe detail page:
 * without this, Next renders the URL on demand, hits `notFound()`, then caches
 * that result with a 200 status for a year — a soft 404 a crawler will index.
 */
export const dynamicParams = false;

export function generateStaticParams() {
  return RECIPE_SEED.map((recipe) => ({ slug: recipe.slug }));
}

export default async function BrewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recipe = RECIPE_SEED.find((item) => item.slug === slug);
  if (!recipe) notFound();
  return <BrewMode recipe={recipe} />;
}
