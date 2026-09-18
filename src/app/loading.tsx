import { RailSkeleton } from '@/components/ui/Skeleton';

/**
 * The route-level fallback. It mirrors the Home page's structure — greeting,
 * search bar, category rail, feature card, content rails — so the transition
 * into real content is a fill, not a re-layout.
 */
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="content-container py-8">
      <span className="sr-only">Loading</span>

      <div className="skeleton h-4 w-40 rounded-md" />
      <div className="skeleton mt-3 h-9 w-72 max-w-full rounded-md" />
      <div className="skeleton mt-6 h-12 w-full rounded-full" />

      <div className="mt-6 flex gap-2 overflow-hidden">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="skeleton h-10 w-24 shrink-0 rounded-full" />
        ))}
      </div>

      <div className="skeleton rounded-card mt-10 aspect-[16/10] w-full sm:aspect-[21/9]" />

      <div className="mt-10">
        <div className="skeleton h-7 w-48 rounded-md" />
        <div className="mt-4">
          <RailSkeleton />
        </div>
      </div>
    </div>
  );
}
