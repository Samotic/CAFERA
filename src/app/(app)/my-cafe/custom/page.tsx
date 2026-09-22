import Link from 'next/link';
import { ArrowRight, Plus } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';

export default function CustomRecipesPage() {
  return (
    <div className="content-container py-10 sm:py-14">
      <div className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="text-xs font-semibold tracking-[0.22em] text-accent-text uppercase">
            Your recipes
          </p>
          <h1 className="mt-3 font-display text-[length:var(--text-display-md)] font-semibold">
            Custom recipes
          </h1>
          <p className="mt-4 max-w-xl text-lg leading-relaxed text-text-secondary">
            Keep the recipes you have tuned until they taste exactly like yours.
          </p>
        </div>
        <ButtonLink href="/my-cafe/custom/new" size="lg">
          <Plus className="size-4" /> Create recipe
        </ButtonLink>
      </div>
      <section className="mt-12 rounded-card border border-border bg-card p-8 text-center sm:p-12">
        <h2 className="font-display text-2xl font-semibold">Your recipe book is waiting</h2>
        <p className="mx-auto mt-3 max-w-md text-text-secondary">
          Create a recipe draft now. Sign in later to sync it across devices and publish it to the
          community.
        </p>
        <Link
          href="/my-cafe/custom/new"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-accent-text"
        >
          Create your first recipe <ArrowRight className="size-4" />
        </Link>
      </section>
    </div>
  );
}
