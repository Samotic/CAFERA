import { Coffee } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { ButtonLink } from '@/components/ui/Button';

/**
 * The 404. It offers two real ways forward rather than an apology — a dead end
 * is the point at which a visitor closes the tab.
 */
export default function NotFound() {
  return (
    <div className="bg-page flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Logo size="lg" />

      <span className="bg-accent-soft text-accent-text mt-10 flex size-16 items-center justify-center rounded-full">
        <Coffee aria-hidden className="size-7" />
      </span>

      <h1 className="font-display text-text mt-6 text-3xl font-semibold">This cup is empty</h1>
      <p className="text-text-muted mt-3 max-w-md text-[0.9375rem] leading-relaxed">
        We could not find the page you were looking for. It may have been moved, or the link may
        have a typo in it.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <ButtonLink href="/discover">Browse all recipes</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Back to home
        </ButtonLink>
      </div>
    </div>
  );
}
