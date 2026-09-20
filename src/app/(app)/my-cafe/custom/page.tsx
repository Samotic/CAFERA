import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';

export default function CustomRecipesPage() {
  return (
    <div className="content-container py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-accent-text text-xs font-semibold uppercase tracking-[0.22em]">
            Your recipes
          </p>
          <h1 className="font-display mt-3 text-[length:var(--text-display-md)] font-semibold">
            Custom recipes
          </h1>
          <p className="text-text-secondary mt-4 max-w-xl text-lg leading-relaxed">
            Keep the recipes you have tuned until they taste exactly like yours.
          </p>
        </div>
        <ButtonLink href="/my-cafe/custom/new" size="lg">
          <Plus className="size-4" /> Create recipe
        </ButtonLink>
      </div>
      <section className="rounded-card border-border bg-card mt-12 border p-8 text-center sm:p-12">
        <h2 className="font-display text-2xl font-semibold">Your recipe book is waiting</h2>
        <p className="text-text-secondary mx-auto mt-3 max-w-md">
          Create a recipe draft now. Sign in later to sync it across devices and publish it to the
          community.
        </p>
        <Link
          href="/my-cafe/custom/new"
          className="text-accent-text mt-6 inline-flex items-center gap-2 text-sm font-semibold"
        >
          Create your first recipe <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  );
}
