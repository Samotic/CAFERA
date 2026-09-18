import Link from 'next/link';
import { ArrowRight, Search } from 'lucide-react';
import { CATEGORY_META, SITE_TAGLINE_PARTS } from '@/constants/home';
import { ButtonLink } from '@/components/ui/Button';
import { ChipLink } from '@/components/ui/Chip';

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
          className="from-sunken via-page to-accent-soft absolute inset-0 bg-gradient-to-br"
        />

        <div className="content-container relative py-16 sm:py-24 lg:py-32">
          <div className="max-w-2xl">
            <p className="text-accent-text text-xs font-semibold uppercase tracking-[0.22em]">
              {SITE_TAGLINE_PARTS.join(' · ')}
            </p>

            <h1 className="font-display text-text mt-5 text-[length:var(--text-display-lg)] font-semibold leading-[1.05]">
              Every great cup starts with knowing how.
            </h1>

            <p className="text-text-secondary mt-6 max-w-xl text-lg leading-relaxed">
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
          className="border-border-strong bg-card text-text-muted hover:border-accent-line flex h-14 w-full items-center gap-3 rounded-full border px-5 transition-colors"
        >
          <Search aria-hidden className="size-5 shrink-0" />
          <span className="text-[0.9375rem]">Search coffee, ingredients…</span>
          <kbd className="border-border bg-sunken text-text-muted ml-auto hidden rounded border px-2 py-1 font-sans text-xs lg:inline-block">
            Ctrl K
          </kbd>
        </Link>
      </section>

      <section className="content-container pb-16" aria-labelledby="home-categories-heading">
        <h2
          id="home-categories-heading"
          className="font-display text-text text-[length:var(--text-display-sm)] font-semibold"
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
    </>
  );
}
