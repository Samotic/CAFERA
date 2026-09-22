import { cn } from '@/lib/cn';

/**
 * Skeletons exist to hold the exact space the real content will occupy. A
 * skeleton that is the wrong size is worse than a spinner, because it promises a
 * layout and then moves it — which is precisely the CLS the spec budgets against.
 *
 * They are hidden from assistive tech: a screen reader user is told "loading"
 * once by the live region on the page, not by forty empty boxes.
 */

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn('skeleton rounded-md', className)} {...props} />;
}

/** Matches RecipeCard's geometry exactly: 1:1 image, title, meta row. */
export function RecipeCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-card bg-card shadow-sm">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="flex flex-col gap-2 p-4">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="h-3.5 w-2/3" />
        <div className="mt-1 flex gap-2">
          <Skeleton className="h-6 w-16 rounded-full" />
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function RecipeGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading recipes"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
    >
      {Array.from({ length: count }, (_, index) => (
        <RecipeCardSkeleton key={index} />
      ))}
    </div>
  );
}

export function RailSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div aria-hidden className="scroll-rail gap-4 pb-2">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="w-[70vw] max-w-[280px] sm:w-[280px]">
          <RecipeCardSkeleton />
        </div>
      ))}
    </div>
  );
}

export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div aria-hidden className="flex flex-col gap-2">
      {Array.from({ length: lines }, (_, index) => (
        <Skeleton key={index} className={cn('h-4', index === lines - 1 ? 'w-2/3' : 'w-full')} />
      ))}
    </div>
  );
}
