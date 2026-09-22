import { cn } from '@/lib/cn';
import { ButtonLink } from './Button';

/**
 * The state a screen is in when there is nothing to show.
 *
 * An empty state is not an error and must never look like one. It says what
 * would appear here, and offers the one action that would fill it — a dead end
 * with no way forward is the most common way an otherwise good screen fails.
 */
export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  title: string;
  description: string;
  action?: { href: string; label: string };
  secondary?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondary,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn('flex flex-col items-center justify-center px-6 py-16 text-center', className)}
    >
      {Icon ? (
        <span className="mb-5 flex size-16 items-center justify-center rounded-full bg-accent-soft text-accent-text">
          <Icon aria-hidden className="size-7" />
        </span>
      ) : null}

      <h2 className="font-display text-xl font-semibold text-text">{title}</h2>
      <p className="mt-2 max-w-sm text-[0.9375rem] leading-relaxed text-text-muted">
        {description}
      </p>

      {action ? (
        <ButtonLink href={action.href} className="mt-6">
          {action.label}
        </ButtonLink>
      ) : null}

      {secondary ? <div className="mt-4">{secondary}</div> : null}
    </div>
  );
}
