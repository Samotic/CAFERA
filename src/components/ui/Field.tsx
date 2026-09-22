'use client';

import { forwardRef, useId } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

/**
 * Form fields.
 *
 * The label is always a real `<label for>`, the error is always wired through
 * `aria-describedby` and `aria-invalid`, and the error text carries an icon as
 * well as colour. Validation feedback that is only red is invisible to a
 * colour-blind user and to a screen reader alike.
 */

export interface FieldProps {
  label: string;
  /** Hidden visually but kept for assistive tech — for search bars and similar. */
  hideLabel?: boolean;
  hint?: string;
  error?: string;
  required?: boolean;
  children: (props: {
    id: string;
    'aria-describedby': string | undefined;
    'aria-invalid': boolean | undefined;
    'aria-required': boolean | undefined;
  }) => React.ReactNode;
  className?: string;
}

export function Field({
  label,
  hideLabel = false,
  hint,
  error,
  required,
  children,
  className,
}: FieldProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ');

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className={cn('text-sm font-medium text-text', hideLabel && 'sr-only')}>
        {label}
        {required ? (
          <span className="ml-0.5 text-danger" aria-hidden>
            *
          </span>
        ) : null}
      </label>

      {children({
        id,
        'aria-describedby': describedBy || undefined,
        'aria-invalid': error ? true : undefined,
        'aria-required': required || undefined,
      })}

      {hint && !error ? (
        <p id={hintId} className="text-xs text-text-muted">
          {hint}
        </p>
      ) : null}

      {error ? (
        /* `role="alert"` so the message is announced the moment it appears. */
        <p id={errorId} role="alert" className="flex items-start gap-1.5 text-xs text-danger">
          <AlertCircle aria-hidden className="mt-px size-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

const INPUT_BASE =
  'w-full rounded-md border bg-card px-3.5 text-[0.9375rem] text-text ' +
  'placeholder:text-text-muted transition-colors duration-150 ' +
  ' ' +
  'disabled:cursor-not-allowed disabled:opacity-60 ' +
  /* 44px tall: comfortably above the minimum touch target. */
  'h-11';

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...props }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          INPUT_BASE,
          props['aria-invalid'] ? 'border-danger' : 'border-border-strong hover:border-accent-line',
          className,
        )}
        {...props}
      />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className, rows = 4, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        INPUT_BASE,
        'h-auto resize-y py-2.5 leading-relaxed',
        props['aria-invalid'] ? 'border-danger' : 'border-border-strong hover:border-accent-line',
        className,
      )}
      {...props}
    />
  );
});

export const Select = forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  function Select({ className, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(INPUT_BASE, 'border-border-strong pr-9 hover:border-accent-line', className)}
        {...props}
      />
    );
  },
);

/**
 * A checkbox with its label as one click target. Native input, native keyboard
 * behaviour, native form participation — restyled, not reimplemented.
 */
export function Checkbox({
  label,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode }) {
  const id = useId();
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        id={id}
        type="checkbox"
        className={cn(
          'mt-0.5 size-5 shrink-0 cursor-pointer rounded border-border-strong accent-accent-line',
          '',
        )}
        {...props}
      />
      <label
        htmlFor={id}
        className="cursor-pointer text-[0.9375rem] leading-6 text-text select-none"
      >
        {label}
      </label>
    </div>
  );
}
