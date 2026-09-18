'use client';

import { useCallback, useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from './Button';

/**
 * A panel anchored to an edge of the viewport: the filter drawer on mobile, the
 * navigation menu under `lg`.
 *
 * Same reasoning as Modal — a native `<dialog>` supplies the focus trap, Esc
 * handling and focus restoration. Only the geometry and the slide transition
 * differ, so the two components share an approach rather than a base class.
 *
 * Height is `100dvh`, not `100vh`: on mobile Safari and Chrome the URL bar makes
 * `vh` taller than the visible viewport, which would push a sheet's action
 * buttons underneath the browser chrome.
 */

export type SheetSide = 'bottom' | 'right' | 'left';

export interface SheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  side?: SheetSide;
  children: React.ReactNode;
  /** Pinned below the scrollable body — "Apply" and "Clear all" belong here. */
  footer?: React.ReactNode;
  className?: string;
}

const SIDE_STYLES: Record<SheetSide, string> = {
  bottom: 'mt-auto mb-0 mx-auto w-full max-w-2xl max-h-[85dvh] rounded-t-xl',
  right: 'ml-auto mr-0 my-0 h-dvh max-h-dvh w-[min(24rem,90vw)] rounded-l-xl',
  left: 'mr-auto ml-0 my-0 h-dvh max-h-dvh w-[min(24rem,90vw)] rounded-r-xl',
};

const SIDE_ANIMATION: Record<SheetSide, string> = {
  bottom: 'open:animate-[cafera-sheet-up_250ms_ease-out]',
  right: 'open:animate-[cafera-sheet-right_250ms_ease-out]',
  left: 'open:animate-[cafera-sheet-left_250ms_ease-out]',
};

export function Sheet({
  isOpen,
  onClose,
  title,
  side = 'bottom',
  children,
  footer,
  className,
}: SheetProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

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

  const handleCancel = useCallback(
    (event: React.SyntheticEvent<HTMLDialogElement>) => {
      event.preventDefault();
      onClose();
    },
    [onClose],
  );

  const handleBackdropClick = useCallback(
    (event: React.MouseEvent<HTMLDialogElement>) => {
      if (event.target === dialogRef.current) onClose();
    },
    [onClose],
  );

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onClick={handleBackdropClick}
      aria-labelledby={titleId}
      className={cn(
        'bg-card text-text max-w-none p-0 shadow-xl',
        'backdrop:bg-[rgb(32_26_23/0.5)] backdrop:backdrop-blur-sm',
        SIDE_STYLES[side],
        SIDE_ANIMATION[side],
        'motion-reduce:animate-none',
        className,
      )}
    >
      <div className="flex h-full flex-col">
        <header className="border-border flex items-center justify-between gap-4 border-b px-5 py-4">
          <h2 id={titleId} className="font-display text-text text-lg font-semibold">
            {title}
          </h2>
          <IconButton label="Close" onClick={onClose} size="sm">
            <X aria-hidden className="size-5" />
          </IconButton>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>

        {footer ? (
          <footer className="border-border safe-bottom bg-card flex gap-3 border-t px-5 py-4">
            {footer}
          </footer>
        ) : null}
      </div>
    </dialog>
  );
}
