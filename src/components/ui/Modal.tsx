'use client';

import { useId } from 'react';
import { X } from 'lucide-react';
import { useNativeDialog } from '@/hooks/useNativeDialog';
import { cn } from '@/lib/cn';
import { IconButton } from './Button';

/**
 * A centred dialog, built on the native `<dialog>` element opened with
 * `showModal()`.
 *
 * That one decision hands us, from the platform: a real focus trap, Esc to
 * close, focus restored to the trigger, inert background content, and correct
 * `role="dialog" aria-modal` semantics. Every hand-rolled modal reimplements
 * those four things and most get at least one wrong.
 *
 * The two things the platform does *not* provide — a body scroll lock and an
 * exit animation — are solved once and shared with Sheet: `useNativeDialog`
 * wires the behaviour, and the transition is CSS in `globals.css` keyed off
 * `data-cafera-dialog`. Neither is reimplemented here.
 */

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Suppress the close affordances for a decision the user must actually make. */
  dismissible?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
} as const;

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  dismissible = true,
  size = 'md',
  className,
}: ModalProps) {
  const { ref, onCancel, onClick } = useNativeDialog({ isOpen, onClose, dismissible });
  const titleId = useId();
  const descriptionId = useId();

  return (
    <dialog
      ref={ref}
      onCancel={onCancel}
      onClick={onClick}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      data-cafera-dialog=""
      data-dialog-variant="center"
      className={cn(
        'bg-transparent p-0 text-inherit backdrop:bg-[rgb(32_26_23/0.55)] backdrop:backdrop-blur-sm',
        'm-auto w-[calc(100%-2rem)]',
        SIZES[size],
        className,
      )}
    >
      <div className="flex max-h-[85dvh] flex-col rounded-xl bg-card shadow-xl">
        <header className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div>
            <h2 id={titleId} className="font-display text-xl font-semibold text-text">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm text-text-muted">
                {description}
              </p>
            ) : null}
          </div>
          {dismissible ? (
            <IconButton label="Close dialog" onClick={onClose} size="sm">
              <X aria-hidden className="size-5" />
            </IconButton>
          ) : null}
        </header>

        <div className="overflow-y-auto overscroll-contain p-5">{children}</div>

        {footer ? (
          <footer className="flex flex-wrap justify-end gap-3 border-t border-border p-5">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
