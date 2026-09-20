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
        <p className="text-accent-text text-xs font-semibold uppercase tracking-[0.22em]">
          The recipe library
        </p>
        <h1 className="font-display mt-3 text-[length:var(--text-display-md)] font-semibold">
          Find your next cup.
        </h1>
        <p className="text-text-secondary mt-4 text-lg leading-relaxed">
          Twenty-five recipes with the ratio, equipment, and method already thought through.
        </p>
      </div>

      <form className="mt-8 flex max-w-3xl gap-3" action="/discover">
        <label className="relative block flex-1">
          <Search
            aria-hidden
            className="text-text-muted absolute left-4 top-1/2 size-5 -translate-y-1/2"
          />
          <input
            name="q"
            defaultValue={params.q}
            placeholder="Search by drink, origin, or ingredient"
            className="border-border-strong bg-card text-text placeholder:text-text-muted h-14 w-full rounded-full border pl-12 pr-5 outline-none"
          />
        </label>
        <button
          className="bg-primary text-on-primary hover:bg-primary-hover rounded-full px-6 font-semibold transition"
          type="submit"
        >
          Search
        </button>
      </form>

      <div className="mt-8 flex flex-wrap gap-2" aria-label="Recipe categories">
        <a
          href="/discover"
          className="border-border-strong bg-card rounded-full border px-4 py-2 text-sm font-medium"
        >
          All
        </a>
        {CATEGORY_META.map((category) => (
          <a
            key={category.slug}
            href={`/discover?category=${category.slug}`}
            className="border-border bg-card text-text-secondary hover:border-accent-line rounded-full border px-4 py-2 text-sm font-medium"
          >
            {category.label}
          </a>
        ))}
      </div>

      <div className="mt-12 flex items-end justify-between gap-4">
        <h2 className="font-display text-2xl font-semibold">{filtered.length} recipes</h2>
        {(query || params.category || params.facet) && (
          <a href="/discover" className="text-accent-text text-sm font-semibold">
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
        <p className="rounded-card border-border bg-card text-text-secondary mt-6 border p-8">
          No recipes match that search yet. Try a different origin or brew style.
        </p>
      )}
    </div>
  );
}
