import { Search } from 'lucide-react';
import { RecipeCard } from '@/components/recipe/RecipeCard';
import { RECIPE_SEED } from '@/lib/seed/recipes';
import { CATEGORY_META } from '@/lib/constants/categories';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Discover coffee recipes',
  description:
    "Search CAFERA's collection of 25 specialty coffee recipes by style, origin, and brewing method.",
  alternates: { canonical: '/discover' },
};

type DiscoverParams = Promise<{ q?: string; category?: string; facet?: string }>;

export default async function DiscoverPage({ searchParams }: { searchParams: DiscoverParams }) {
  const params = await searchParams;
  const query = params.q?.trim().toLowerCase() ?? '';
  const filtered = RECIPE_SEED.filter((recipe) => {
    const matchesQuery =
      !query ||
      [recipe.name, recipe.description, recipe.origin, ...recipe.tags]
        .join(' ')
        .toLowerCase()
        .includes(query);
    const matchesCategory = !params.category || recipe.category === params.category;
    const matchesFacet =
      !params.facet ||
      recipe.tags.includes(params.facet) ||
      (params.facet === 'milk' && recipe.containsMilk);
    return matchesQuery && matchesCategory && matchesFacet;
  });

  return (
    <div className="content-container py-10 sm:py-14">
      <div className="max-w-2xl">
        <p className="text-xs font-semibold tracking-[0.22em] text-accent-text uppercase">
          The recipe library
        </p>
        <h1 className="mt-3 font-display text-[length:var(--text-display-md)] font-semibold">
          Find your next cup.
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-text-secondary">
          Twenty-five recipes with the ratio, equipment, and method already thought through.
        </p>
      </div>

      <form className="mt-8 flex max-w-3xl gap-3" action="/discover">
        <label className="relative block flex-1">
          <Search
            aria-hidden
            className="absolute top-1/2 left-4 size-5 -translate-y-1/2 text-text-muted"
          />
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Search by drink, origin, or ingredient"
            className="h-14 w-full rounded-full border border-border-strong bg-card pr-5 pl-12 text-text outline-none placeholder:text-text-muted"
          />
        </label>
        <button
          className="rounded-full bg-primary px-6 font-semibold text-on-primary transition hover:bg-primary-hover"
          type="submit"
        >
          Search
        </button>
      </form>

      <div className="mt-8 flex flex-wrap gap-2" aria-label="Recipe categories">
        <a
          href="/discover"
          className="rounded-full border border-border-strong bg-card px-4 py-2 text-sm font-medium"
        >
          All
        </a>
        {CATEGORY_META.map((category) => (
          <a
            key={category.slug}
            href={`/discover?category=${category.slug}`}
            className="rounded-full border border-border bg-card px-4 py-2 text-sm font-medium text-text-secondary hover:border-accent-line"
          >
            {category.label}
          </a>
        ))}
      </div>

      <div className="mt-12 flex items-end justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold">{filtered.length} recipes</h2>
        {(query || params.category || params.facet) && (
          <a href="/discover" className="text-sm font-semibold text-accent-text">
            Clear filters
          </a>
        )}
      </div>
      {filtered.length ? (
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.slug} recipe={recipe} />
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-card border border-border bg-card p-8 text-text-secondary">
          No recipes match that search yet. Try a different origin or brew style.
        </p>
      )}
    </div>
  );
}
