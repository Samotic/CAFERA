import Link from 'next/link';
import { cn } from '@/lib/cn';

/**
 * Chips do three different jobs, so they come in three shapes rather than one
 * component with a mode flag:
 *
 * - `InfoChip`   — static metadata (10 min, Easy, Hot). Not interactive.
 * - `ChipLink`   — a category filter that navigates. An anchor, so it is
 *                  shareable and back-button correct.
 * - `ChipToggle` — an in-page filter toggle. A real button with `aria-pressed`.
 *
 * Selected state is never signalled by colour alone: the selected chip also
 * gains a heavier weight and a filled background, and the toggle exposes
 * `aria-pressed` for assistive tech.
 */

const CHIP_BASE =
  'inline-flex items-center gap-1.5 rounded-pill px-3.5 py-2 text-sm whitespace-nowrap ' +
  'transition-colors duration-150 ease-out';

/* Touch-target floor. The focus ring is global (see globals.css) and must not
   be re-declared here — a local outline utility outranks it and drops the halo. */
const CHIP_INTERACTIVE = 'min-h-11 sm:min-h-10';

export function InfoChip({
  icon: Icon,
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & {
  icon?: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
}) {
  return (
    <span
      className={cn(
        CHIP_BASE,
        'border border-border bg-sunken font-medium text-text-secondary',
        className,
      )}
      {...props}
    >
      {Icon ? <Icon aria-hidden className="size-4 shrink-0" /> : null}
      {children}
    </span>
  );
}

export interface ChipLinkProps extends React.ComponentPropsWithoutRef<typeof Link> {
  isActive?: boolean;
}

export function ChipLink({ isActive = false, className, ...props }: ChipLinkProps) {
  return (
    <Link
      /* `aria-current="true"` rather than a colour cue alone. */
      aria-current={isActive ? 'true' : undefined}
      className={cn(
        CHIP_BASE,
        CHIP_INTERACTIVE,
        isActive
          ? 'bg-primary font-semibold text-on-primary shadow-sm'
          : 'border border-border bg-card font-medium text-text-secondary hover:border-accent-line hover:text-text',
        className,
      )}
      {...props}
    />
  );
}

export interface ChipToggleProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isSelected: boolean;
}

export function ChipToggle({ isSelected, className, ...props }: ChipToggleProps) {
  return (
    <button
      type="button"
      aria-pressed={isSelected}
      className={cn(
        CHIP_BASE,
        CHIP_INTERACTIVE,
        isSelected
          ? 'border border-accent-line bg-accent-soft font-semibold text-accent-text'
          : 'border border-border bg-card font-medium text-text-secondary hover:border-border-strong hover:text-text',
        className,
      )}
      {...props}
    />
  );
}

/**
 * An active filter shown above the results, with its own remove control. The
 * label and the dismiss button are one button: the entire pill removes the
 * filter, which is what people expect and what keeps the tab order short.
 */
export function FilterPill({
  label,
  value,
  onRemove,
}: {
  label: string;
  value: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className={cn(
        CHIP_BASE,
        CHIP_INTERACTIVE,
        'border border-accent-line bg-accent-soft font-medium text-accent-text hover:bg-sunken',
      )}
    >
      <span className="text-text-muted">{label}:</span>
      <span className="font-semibold">{value}</span>
      <span aria-hidden className="ml-0.5 text-base leading-none">
        &times;
      </span>
      <span className="sr-only">Remove {label} filter</span>
    </button>
  );
}
