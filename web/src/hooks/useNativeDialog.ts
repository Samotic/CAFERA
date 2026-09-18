'use client';

import { useCallback, useEffect, useRef, type RefObject } from 'react';
import { useScrollLock } from './useScrollLock';

/**
 * Everything Modal, Sheet and ConfirmDialog share about driving a native
 * `<dialog>`, in one place.
 *
 * The platform already provides the hard parts — focus trap, Esc, focus
 * restoration, inert background, correct ARIA semantics — so this adds only the
 * two things it does not:
 *
 *  - the body scroll lock (see `useScrollLock`), and
 *  - closing on a backdrop click, which the platform reports as a click on the
 *    `<dialog>` itself and which must be distinguished from a click on the
 *    panel's own padding.
 *
 * The exit animation is deliberately **not** handled here. It is pure CSS in
 * `globals.css` using `@starting-style`, `transition-behavior: allow-discrete`
 * and a transition on `overlay`, which keeps the element in the top layer for
 * the duration of the close. Doing it in JavaScript would mean a timer that has
 * to agree with a CSS duration — two sources of truth that drift the first time
 * someone adjusts the timing.
 */
export interface UseNativeDialogOptions {
  isOpen: boolean;
  onClose: () => void;
  /** When false, Esc and backdrop clicks are ignored. */
  dismissible?: boolean;
}

export interface UseNativeDialogResult {
  ref: RefObject<HTMLDialogElement | null>;
  onCancel: (event: React.SyntheticEvent<HTMLDialogElement>) => void;
  onClick: (event: React.MouseEvent<HTMLDialogElement>) => void;
}

/**
 * How long to wait before checking whether the engine restored focus itself.
 * Comfortably past the 220ms exit transition, so the check sees the settled
 * state rather than an intermediate one.
 */
const FOCUS_RESTORE_CHECK_MS = 320;

export function useNativeDialog({
  isOpen,
  onClose,
  dismissible = true,
}: UseNativeDialogOptions): UseNativeDialogResult {
  const ref = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  /* The lock follows `isOpen` rather than being toggled alongside showModal(),
     so an unmount mid-transition still releases it. */
  useScrollLock(isOpen);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    if (isOpen && !dialog.open) {
      // Remembered for the WebKit fallback below.
      triggerRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
    } else if (!isOpen && dialog.open) {
      /* `close()` is what starts the exit transition: with allow-discrete the
         browser holds the element in the top layer until the transition ends. */
      dialog.close();
    }
  }, [isOpen]);

  /**
   * Focus restoration fallback for WebKit.
   *
   * Chromium and Firefox return focus to the element that opened the dialog.
   * **Safari does not** when `close()` is called programmatically: focus sits on
   * the dialog's own close button for a moment and then falls to `<body>`,
   * which strands a keyboard user at the top of the page with no way back to
   * where they were. Verified in the Playwright WebKit run.
   *
   * So the trigger is restored manually — but only if the engine has not already
   * done it, and only if focus actually got lost. Focusing unconditionally would
   * fight the browsers that get it right, and would also yank focus away from
   * wherever the user has deliberately moved it in the meantime.
   */
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;

    const handleClose = () => {
      const trigger = triggerRef.current;
      triggerRef.current = null;
      if (!trigger) return;

      window.setTimeout(() => {
        if (!trigger.isConnected) return;

        const active = document.activeElement;
        const focusWasLost = !active || active === document.body || dialog.contains(active);
        if (focusWasLost) trigger.focus();
      }, FOCUS_RESTORE_CHECK_MS);
    };

    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, []);

  /* If the component unmounts while open — a route change mid-dialog — the
     dialog element goes with it, but the scroll lock is document-level and
     would otherwise be stranded. useScrollLock's cleanup covers that; this
     closes the element itself so no stale top-layer entry is left behind. */
  useEffect(() => {
    const dialog = ref.current;
    return () => {
      if (dialog?.open) dialog.close();
    };
  }, []);

  /**
   * Esc fires `cancel`. The default is prevented so React state stays the single
   * source of truth for whether the dialog is open — otherwise the element
   * closes itself, `isOpen` stays true, and the dialog cannot be reopened.
   */
  const onCancel = useCallback(
    (event: React.SyntheticEvent<HTMLDialogElement>) => {
      event.preventDefault();
      if (dismissible) onClose();
    },
    [dismissible, onClose],
  );

  const onClick = useCallback(
    (event: React.MouseEvent<HTMLDialogElement>) => {
      if (!dismissible) return;
      // Only the backdrop: a click on the panel inside bubbles up with a
      // different target, and closing on that would make the dialog unusable.
      if (event.target === ref.current) onClose();
    },
    [dismissible, onClose],
  );

  return { ref, onCancel, onClick };
}
