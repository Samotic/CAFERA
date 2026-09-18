import { cn } from '@/lib/cn';

/**
 * The CAFERA mark: a cup seen from the side, its saucer drawn as one open
 * stroke, with a coffee bean set in the bowl. Inline SVG rather than an image
 * file so it inherits `currentColor`, stays crisp at any size, and costs no
 * extra request.
 */
export function LogoMark({ className, ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      role="presentation"
      aria-hidden
      className={cn('size-8', className)}
      {...props}
    >
      {/* Cup body */}
      <path
        d="M6 11h16v7a8 8 0 0 1-8 8h0a8 8 0 0 1-8-8v-7Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      {/* Handle */}
      <path
        d="M22 13h2.5a3.5 3.5 0 0 1 0 7H22"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      {/* Saucer */}
      <path d="M3 29h22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Bean, with its characteristic centre crease */}
      <ellipse cx="14" cy="17.5" rx="3.6" ry="2.6" fill="currentColor" opacity="0.9" />
      <path
        d="M11.2 18.4c1.6-1.4 4-1.4 5.6 0"
        stroke="var(--color-card)"
        strokeWidth="1.1"
        strokeLinecap="round"
      />
      {/* Steam */}
      <path
        d="M11 3c-1.2 1.4-1.2 2.6 0 4s1.2 2.6 0 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.55"
      />
      <path
        d="M17 4c-1 1.1-1 2.1 0 3.2s1 2.1 0 3.2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        opacity="0.35"
      />
    </svg>
  );
}

/**
 * The full lockup. The wordmark is live text, not a path, so it is selectable,
 * searchable and scales with the user's font settings.
 */
export function Logo({
  className,
  showTagline = false,
  size = 'md',
}: {
  className?: string;
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
}) {
  const markSize = size === 'sm' ? 'size-7' : size === 'lg' ? 'size-11' : 'size-8';
  const textSize = size === 'sm' ? 'text-lg' : size === 'lg' ? 'text-3xl' : 'text-xl';

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark className={cn(markSize, 'text-accent-line shrink-0')} />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            'font-display text-text font-semibold uppercase tracking-[0.18em]',
            textSize,
          )}
        >
          Cafera
        </span>
        {showTagline ? (
          <span className="text-text-muted mt-1.5 text-[0.6875rem] uppercase tracking-[0.22em]">
            Discover. Brew. Enjoy.
          </span>
        ) : null}
      </span>
    </span>
  );
}
