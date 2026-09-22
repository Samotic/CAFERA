import { Coffee } from 'lucide-react';
import { Logo } from '@/components/brand/Logo';
import { ButtonLink } from '@/components/ui/Button';

/**
 * The 404. It offers two real ways forward rather than an apology — a dead end
 * is the point at which a visitor closes the tab.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-page px-6 text-center">
      <Logo size="lg" />

      <span className="mt-10 flex size-16 items-center justify-center rounded-full bg-accent-soft text-accent-text">
        <Coffee aria-hidden className="size-7" />
      </span>

      <h1 className="mt-6 font-display text-3xl font-semibold text-text">This cup is empty</h1>
      <p className="mt-3 max-w-md text-[0.9375rem] leading-relaxed text-text-muted">
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
