import Link from 'next/link';
import { cn } from '@/lib/cn';

/**
 * The surface every piece of content sits on. Three levels of emphasis:
 * `flat` for grouped rows, `raised` for standalone cards, `outline` for
 * secondary panels that should recede.
 */

export type CardVariant = 'flat' | 'raised' | 'outline';

const CARD_VARIANTS: Record<CardVariant, string> = {
  flat: 'bg-card',
  raised: 'bg-card shadow-sm',
  outline: 'bg-transparent border border-border',
};

export interface CardProps extends React.HTMLAttributes<HTMLElement> {
  variant?: CardVariant;
  /** Cards inside a list must be `li`; standalone content cards read as `article`. */
  as?: 'div' | 'article' | 'section' | 'li';
}

export function Card({ variant = 'raised', as: Tag = 'div', className, ...props }: CardProps) {
  return (
    <Tag
      className={cn('rounded-card overflow-hidden', CARD_VARIANTS[variant], className)}
      {...props}
    />
  );
}

/**
 * A card that is entirely one link.
 *
 * The whole surface is the anchor rather than a nested "read more" link, so
 * there is a single tab stop and a single accessible name per card. Nested
 * interactive controls (a favourite heart) are rendered as siblings positioned
 * over it, never as children of the anchor — a button inside a link is invalid
 * HTML and behaves unpredictably with both keyboards and screen readers.
 */
export interface CardLinkProps extends React.ComponentPropsWithoutRef<typeof Link> {
  variant?: CardVariant;
}

export function CardLink({ variant = 'raised', className, ...props }: CardLinkProps) {
  return (
    <Link
      className={cn(
        'rounded-card group/card relative block overflow-hidden transition-all duration-200 ease-out',
        'hover:-translate-y-0.5 hover:shadow-lg',
        '',
        'motion-reduce:transform-none motion-reduce:transition-none',
        CARD_VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
}

export function CardBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('p-4 sm:p-5', className)} {...props} />;
}

export function CardTitle({
  as: Tag = 'h3',
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & { as?: 'h2' | 'h3' | 'h4' }) {
  return (
    <Tag
      className={cn('font-display text-text text-lg font-semibold leading-snug', className)}
      {...props}
    />
  );
}

export function CardDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn('text-text-muted mt-1 text-sm leading-relaxed', className)} {...props} />;
}
