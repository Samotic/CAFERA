import type { Metadata } from 'next';
import { CustomRecipeBuilder } from '@/components/recipe/CustomRecipeBuilder';

export const metadata: Metadata = {
  title: 'Create a custom recipe',
  robots: { index: false, follow: false },
};

export default function NewCustomRecipePage() {
  return (
    <div className="content-container max-w-4xl py-10 sm:py-14">
      <p className="text-xs font-semibold tracking-[0.22em] text-accent-text uppercase">My Café</p>
      <h1 className="mt-3 font-display text-[length:var(--text-display-md)] font-semibold">
        Make it yours.
      </h1>
      <p className="mt-4 max-w-2xl text-lg leading-relaxed text-text-secondary">
        Build your recipe with the ratio, method, and little details you have learned along the way.
      </p>
      <div className="mt-10">
        <CustomRecipeBuilder />
      </div>
    </div>
  );
}
