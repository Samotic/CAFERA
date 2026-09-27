import Link from 'next/link';
import { forwardRef } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { hrefPathname, prefetchFor } from '@/lib/prefetch';

/**
 * The one button in CAFERA.
 *
 * Every variant carries hover, focus-visible, active and disabled states,
 * because on the web a control without a hover state reads as decoration. Touch
 * targets are at least 44px tall from `md` upwards; the `sm` size is reserved
 * for controls that sit inside an already-large tap target (a card, a row).
 */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'accent';
export type ButtonSize = 'sm' | 'md' | 'lg';

const BASE =
  'relative inline-flex items-center justify-center gap-2 rounded-pill font-medium ' +
  'transition-[background-color,color,border-color,box-shadow,transform] duration-150 ' +
  'ease-out select-none whitespace-nowrap ' +
  ' ' +
  'active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55 ' +
  'motion-reduce:active:scale-100 motion-reduce:transition-none';

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-primary text-on-primary shadow-sm hover:bg-primary-hover hover:shadow-md active:shadow-sm',
  secondary:
    'bg-card text-text border border-border-strong shadow-xs hover:bg-sunken hover:border-accent-line',
  ghost: 'bg-transparent text-text-secondary hover:bg-sunken hover:text-text',
  accent: 'bg-accent text-espresso shadow-sm hover:brightness-[1.06] hover:shadow-md',
  danger: 'bg-danger text-white shadow-sm hover:brightness-110',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3.5 text-sm',
  md: 'h-11 px-5 text-[0.9375rem]',
  lg: 'h-13 px-7 text-base',
};

export function buttonStyles({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && 'w-full', className);
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  isLoading?: boolean;
  /** Announced while `isLoading`; defaults to the button's own label. */
  loadingLabel?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant,
    size,
    fullWidth,
    isLoading = false,
    loadingLabel,
    className,
    children,
    disabled,
    type = 'button',
    ...props
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonStyles({ variant, size, fullWidth, className })}
      disabled={disabled ?? isLoading}
      /* `aria-busy` tells assistive tech the control is working. The label is
         kept visible underneath so the button does not change width mid-submit. */
      aria-busy={isLoading || undefined}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 aria-hidden className="size-4 animate-spin" />
          <span className="sr-only">{loadingLabel ?? 'Working'}</span>
          <span aria-hidden className="opacity-70">
            {children}
          </span>
        </>
      ) : (
        children
      )}
    </button>
  );
});

export interface ButtonLinkProps extends React.ComponentPropsWithoutRef<typeof Link> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

/**
 * A link that looks like a button. Navigation must stay an anchor: it has to be
 * middle-clickable, copyable and openable in a new tab, none of which a
 * `<button onClick={router.push}>` supports.
 */
export function ButtonLink({
  variant,
  size,
  fullWidth,
  className,
  prefetch,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      /**
       * A private destination is not prefetched unless the caller insists.
       *
       * Centralised here rather than repeated at each call site for the reason
       * the nav does the same thing: the home page's "Create account" button was
       * prefetching `/register` on every visit, and that is the kind of thing
       * nobody notices being reintroduced. A route answering
       * `private, no-store` cannot produce a reusable prefetch, so the request
       * buys nothing and spends bandwidth that the LCP element is waiting on.
       *
       * `??` and not `||`, so an explicit `prefetch={false}` is still honoured.
       */
      prefetch={prefetch ?? prefetchFor(hrefPathname(props.href))}
      className={buttonStyles({ variant, size, fullWidth, className })}
      {...props}
    />
  );
}

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Required: an icon-only control is invisible to a screen reader without it. */
  label: string;
  variant?: 'solid' | 'ghost' | 'overlay';
  size?: 'sm' | 'md';
}

const ICON_VARIANTS: Record<NonNullable<IconButtonProps['variant']>, string> = {
  solid: 'bg-card text-text border border-border shadow-sm hover:bg-sunken',
  ghost: 'bg-transparent text-text-secondary hover:bg-sunken hover:text-text',
  /* Sits on top of photography, so it carries its own backdrop for contrast. */
  overlay:
    'bg-[rgb(32_26_23/0.55)] text-white backdrop-blur-sm hover:bg-[rgb(32_26_23/0.72)] ' +
    'border border-white/15',
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, variant = 'ghost', size = 'md', className, type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex items-center justify-center rounded-full transition-all duration-150',
        '',
        'active:scale-95 disabled:pointer-events-none disabled:opacity-50 motion-reduce:active:scale-100',
        /* 44px minimum touch target, even when the glyph inside is 20px. */
        size === 'md' ? 'size-11' : 'size-9',
        ICON_VARIANTS[variant],
        className,
      )}
      {...props}
    />
  );
});
