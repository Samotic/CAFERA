import { notFound } from 'next/navigation';
import { BrewMode } from '@/components/recipe/BrewMode';
import { RECIPE_SEED } from '@/lib/seed/recipes';

export function generateStaticParams() {
  return RECIPE_SEED.map((recipe) => ({ slug: recipe.slug }));
}

export default async function BrewPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recipe = RECIPE_SEED.find((item) => item.slug === slug);
  if (!recipe) notFound();
  return <BrewMode recipe={recipe} />;
}
