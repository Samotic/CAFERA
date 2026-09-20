import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Clock3, MapPin, Play, Scale } from 'lucide-react';
import { RECIPE_SEED } from '@/lib/seed/recipes';
import { RatingDisplay } from '@/components/ui/Rating';
import { ButtonLink } from '@/components/ui/Button';
import type { Metadata } from 'next';
import { SITE } from '@/lib/constants/site';

export function generateStaticParams() {
  return RECIPE_SEED.map((recipe) => ({ slug: recipe.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const recipe = RECIPE_SEED.find((item) => item.slug === slug);
  if (!recipe) return { title: 'Recipe not found' };

  return {
    title: recipe.name,
    description: recipe.description,
    alternates: { canonical: `/recipes/${recipe.slug}` },
    openGraph: {
      type: 'article',
      url: `${SITE.url}/recipes/${recipe.slug}`,
      title: recipe.name,
      description: recipe.description,
      images: [{ url: recipe.image, alt: recipe.name }],
    },
  };
}

export default async function RecipePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const recipe = RECIPE_SEED.find((item) => item.slug === slug);
  if (!recipe) notFound();

  const recipeJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Recipe',
    name: recipe.name,
    description: recipe.description,
    image: [recipe.image],
    author: { '@type': 'Organization', name: SITE.name },
    prepTime: `PT${recipe.preparationTime}M`,
    recipeCategory: recipe.category,
    recipeIngredient: recipe.ingredients.map(
      (ingredient) => `${ingredient.amount} ${ingredient.unit} ${ingredient.name}`,
    ),
    recipeInstructions: recipe.steps.map((step) => ({
      '@type': 'HowToStep',
      text: step.instruction,
    })),
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: recipe.rating,
      ratingCount: recipe.reviewCount,
      bestRating: 5,
    },
  };

  return (
    <article>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(recipeJsonLd) }}
      />
      <div className="content-container py-6">
        <Link
          href="/discover"
          className="text-text-secondary hover:text-text inline-flex items-center gap-2 text-sm font-semibold"
        >
          <ArrowLeft className="size-4" /> All recipes
        </Link>
      </div>
      <div className="content-container grid gap-10 pb-16 lg:grid-cols-[1.1fr_0.9fr] lg:items-start lg:gap-16">
        <div className="rounded-card bg-sunken overflow-hidden">
          <img
            src={recipe.image}
            alt={recipe.name}
            className="aspect-[4/3] h-full w-full object-cover"
          />
        </div>
        <div className="lg:pt-8">
          <p className="text-accent-text text-xs font-semibold uppercase tracking-[0.22em]">
            {recipe.category.replace('-', ' ')}
          </p>
          <h1 className="font-display mt-3 text-[length:var(--text-display-md)] font-semibold leading-tight">
            {recipe.name}
          </h1>
          <p className="text-text-secondary mt-5 text-lg leading-relaxed">{recipe.description}</p>
          <div className="text-text-secondary mt-6 flex flex-wrap gap-4 text-sm">
            <span className="inline-flex items-center gap-2">
              <Clock3 className="size-4" /> {recipe.preparationTime} min
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPin className="size-4" /> {recipe.origin}
            </span>
            <RatingDisplay value={recipe.rating} count={recipe.reviewCount} />
          </div>
          <ButtonLink href={`/recipes/${recipe.slug}/brew`} size="lg" className="mt-8">
            <Play className="size-4" /> Start Brew Mode
          </ButtonLink>
        </div>
      </div>
      <div className="content-container border-border grid gap-10 border-t py-12 lg:grid-cols-[0.7fr_1.3fr]">
        <section aria-labelledby="ingredients-heading">
          <h2 id="ingredients-heading" className="font-display text-2xl font-semibold">
            Ingredients
          </h2>
          <ul className="divide-border rounded-card border-border bg-card mt-5 divide-y border px-5">
            {recipe.ingredients.map((ingredient) => (
              <li
                key={ingredient.name}
                className="flex items-center justify-between gap-4 py-4 text-sm"
              >
                <span>{ingredient.name}</span>
                <span className="text-text-secondary">
                  {ingredient.amount} {ingredient.unit}
                </span>
              </li>
            ))}
          </ul>
          <div className="text-text-muted mt-5 flex items-center gap-2 text-sm">
            <Scale className="size-4" /> Serves one. Scale the coffee and water together.
          </div>
        </section>
        <section aria-labelledby="method-heading">
          <h2 id="method-heading" className="font-display text-2xl font-semibold">
            The method
          </h2>
          <ol className="mt-5 space-y-5">
            {recipe.steps.map((step) => (
              <li key={step.order} className="flex gap-4">
                <span className="bg-accent-soft text-accent-text flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold">
                  {step.order}
                </span>
                <div>
                  <p className="leading-relaxed">{step.instruction}</p>
                  {step.durationSeconds && (
                    <p className="text-text-muted mt-1 text-sm">
                      About {Math.round(step.durationSeconds / 60) || 1} min
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </article>
  );
}
