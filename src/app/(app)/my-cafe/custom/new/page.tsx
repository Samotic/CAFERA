import type { Metadata } from 'next';
import { CustomRecipeBuilder } from '@/components/recipe/CustomRecipeBuilder';

export const metadata: Metadata = {
  title: 'Create a custom recipe',
  robots: { index: false, follow: false },
};

export default function NewCustomRecipePage() {
  return (
    <div className="content-container max-w-4xl py-10 sm:py-14">
      <p className="text-accent-text text-xs font-semibold uppercase tracking-[0.22em]">My Café</p>
      <h1 className="font-display mt-3 text-[length:var(--text-display-md)] font-semibold">
        Make it yours.
      </h1>
      <p className="text-text-secondary mt-4 max-w-2xl text-lg leading-relaxed">
        Build your recipe with the ratio, method, and little details you have learned along the way.
      </p>
      <div className="mt-10">
        <CustomRecipeBuilder />
      </div>
    </div>
  );
}
