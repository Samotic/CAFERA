'use client';

import { useCallback, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from './Button';

/**
 * Built on the native `<dialog>` element opened with `showModal()`.
 *
 * That one decision hands us, from the platform: a real focus trap, Esc to
 * close, focus restored to the trigger, inert background content, and correct
 * `role="dialog" aria-modal` semantics. Every hand-rolled modal reimplements
 * those four things and most get at least one wrong.
 *
 * What is left for us: locking background scroll (the platform does not), and
 * closing on a backdrop click (the platform gives us the click but not the
 * intent — a click on the dialog's own padding must not close it).
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = 'hidden';
    } else if (!isOpen && dialog.open) {
      dialog.close();
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  /* Esc fires `cancel`; we prevent the default close so React state stays the
     single source of truth for whether the dialog is open. */
  const handleCancel = useCallback(
    (event: React.SyntheticEvent<HTMLDialogElement>) => {
      event.preventDefault();
      if (dismissible) onClose();
    },
    [dismissible, onClose],
  );

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDialogElement>) => {
      if (!dismissible) return;
      // The click landed on the <dialog> itself, i.e. the backdrop, not on the
      // panel inside it.
      if (event.target === dialogRef.current) onClose();
    },
    [dismissible, onClose],
  );

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      className={cn(
        'bg-transparent p-0 text-inherit backdrop:bg-[rgb(32_26_23/0.55)] backdrop:backdrop-blur-sm',
        'm-auto w-[calc(100%-2rem)] open:animate-[cafera-modal-in_200ms_ease-out]',
        SIZES[size],
        className,
      )}
    >
      <div className="bg-card flex max-h-[85dvh] flex-col rounded-xl shadow-xl">
        <header className="border-border flex items-start justify-between gap-4 border-b p-5">
          <div>
            <h2 id={titleId} className="font-display text-text text-xl font-semibold">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="text-text-muted mt-1 text-sm">
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

        <div className="overflow-y-auto p-5">{children}</div>

        {footer ? (
          <footer className="border-border flex flex-wrap justify-end gap-3 border-t p-5">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
