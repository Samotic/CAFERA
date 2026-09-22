import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';
import { CATEGORY_META } from '@/lib/constants/categories';
import { SITE_TAGLINE_PARTS } from '@/lib/constants/site';
import { ButtonLink } from '@/components/ui/Button';
import { ChipLink } from '@/components/ui/Chip';
import { RecipeCard } from '@/components/recipe/RecipeCard';
import { RECIPE_SEED } from '@/lib/seed/recipes';

/**
 * Home.
 *
 * Server-rendered, and it shows real recipe content to signed-out visitors
 * immediately — browsing is never gated behind a signup wall. The personalised
 * greeting and recommendation rails are layered on for signed-in users in a
 * client boundary, so the public shell stays cacheable.
 *
 * Content rails arrive with the recipe API in a later phase; the hero, search
 * entry point and category navigation below are the permanent structure.
 */
export default function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden">
        {/* Warm wash standing in for the hero photograph until the imagery lands. */}
        <div
          aria-hidden
          className="absolute inset-0 bg-gradient-to-br from-sunken via-page to-accent-soft"
        />

        <div className="content-container relative py-16 sm:py-24 lg:py-32">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold tracking-[0.22em] text-accent-text uppercase">
              {SITE_TAGLINE_PARTS.join(' · ')}
            </p>

            <h1 className="mt-5 font-display text-[length:var(--text-display-lg)] leading-[1.05] font-semibold text-text">
              Every great cup starts with knowing how.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-text-secondary">
              Twenty-five specialty coffee recipes, from a two-minute espresso to an overnight cold
              brew — each with proper ratios, the right equipment and step-by-step brewing you can
              actually follow.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <ButtonLink href="/discover" size="lg">
                Explore recipes
                <ArrowRight aria-hidden className="size-4" />
              </ButtonLink>
              <ButtonLink href="/register" variant="secondary" size="lg">
                Create account
              </ButtonLink>
            </div>
          </div>
        </div>
      </section>

      <section className="content-container py-10" aria-labelledby="home-search-heading">
        <h2 id="home-search-heading" className="sr-only">
          Search recipes
        </h2>

        {/* A link rather than a live input: the real search experience is the
            command palette and the /discover results page, both of which own
            their own URL state. */}
        <Link
          href="/discover"
          className="flex h-14 w-full items-center gap-3 rounded-full border border-border-strong bg-card px-5 text-text-muted transition-colors hover:border-accent-line"
        >
          <Search aria-hidden className="size-5 shrink-0" />
          <span className="text-[0.9375rem]">Search coffee, ingredients…</span>
          <kbd className="ml-auto hidden rounded border border-border bg-sunken px-2 py-1 font-sans text-xs text-text-muted lg:inline-block">
            Ctrl K
          </kbd>
        </Link>
      </section>

      <section className="content-container pb-16" aria-labelledby="home-categories-heading">
        <h2
          id="home-categories-heading"
          className="font-display text-[length:var(--text-display-sm)] font-semibold text-text"
        >
          Browse by style
        </h2>

        <ul className="scroll-rail mt-5 gap-2.5 pb-2">
          <li>
            <ChipLink href="/discover">All</ChipLink>
          </li>
          {CATEGORY_META.map((category) => (
            <li key={category.slug}>
              <ChipLink href={`/discover?category=${category.slug}`}>{category.label}</ChipLink>
            </li>
          ))}
        </ul>
      </section>

      <section className="content-container pb-20" aria-labelledby="home-featured-heading">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-accent-text uppercase">
              Start here
            </p>
            <h2
              id="home-featured-heading"
              className="mt-2 font-display text-[length:var(--text-display-sm)] font-semibold"
            >
              Good coffee, no guesswork.
            </h2>
          </div>
          <Link
            href="/discover"
            className="hidden text-sm font-semibold text-accent-text sm:inline-flex"
          >
            View all recipes <ArrowRight aria-hidden className="ml-1 size-4" />
          </Link>
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {RECIPE_SEED.slice(0, 4).map((recipe) => (
            <RecipeCard key={recipe.slug} recipe={recipe} />
          ))}
        </div>
        <Link
          href="/discover"
          className="mt-6 inline-flex text-sm font-semibold text-accent-text sm:hidden"
        >
          View all recipes <ArrowRight aria-hidden className="ml-1 size-4" />
        </Link>
      </section>
    </>
  );
}
