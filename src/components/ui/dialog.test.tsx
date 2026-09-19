import { describe, expect, it, vi, afterEach } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Modal } from './Modal';
import { Sheet } from './Sheet';
import { ConfirmDialog } from './ConfirmDialog';
import { getScrollLockCount } from '@/hooks/useScrollLock';

/**
 * Behaviour that the native `<dialog>` does not give us, and that therefore has
 * to be verified rather than assumed.
 *
 * The Esc path is the one that leaks in practice: Esc fires `cancel`, not
 * `close`, so an implementation that releases the lock in an `onClose` handler
 * leaves the page unscrollable after the very first Esc press.
 */

afterEach(() => {
  /* Vitest runs afterEach hooks last-registered-first, so Testing Library's own
     cleanup in vitest.setup.ts has NOT run yet at this point. Unmounting first
     is what makes the assertion below meaningful rather than a reading taken
     while every dialog in the case is still mounted. */
  cleanup();

  expect(
    getScrollLockCount(),
    'A dialog test finished with the scroll lock still held — the page would stay frozen.',
  ).toBe(0);
});

function ModalHarness({ onClose = vi.fn() }: { onClose?: () => void }) {
  return (
    <Modal isOpen onClose={onClose} title="Delete recipe">
      <p>Body</p>
    </Modal>
  );
}

describe('Modal', () => {
  it('locks page scrolling while open and releases it on unmount', () => {
    const { unmount } = render(<ModalHarness />);
    expect(getScrollLockCount()).toBe(1);
    expect(document.body.style.overflow).toBe('hidden');

    unmount();
    expect(getScrollLockCount()).toBe(0);
    expect(document.body.style.overflow).toBe('');
  });

  it('closes via Esc and releases the lock', async () => {
    const onClose = vi.fn();
    const { rerender } = render(<ModalHarness onClose={onClose} />);

    await userEvent.keyboard('{Escape}');
    expect(onClose).toHaveBeenCalledTimes(1);

    /* React state is the source of truth, so the parent closing it is what
       actually dismisses the dialog — and what releases the lock. */
    rerender(
      <Modal isOpen={false} onClose={onClose} title="Delete recipe">
        <p>Body</p>
      </Modal>,
    );
    expect(getScrollLockCount()).toBe(0);
  });

  it('is labelled by its title and described by its description', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Delete recipe" description="This cannot be undone">
        <p>Body</p>
      </Modal>,
    );

    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog).toHaveAccessibleName('Delete recipe');
    expect(dialog).toHaveAccessibleDescription('This cannot be undone');
  });

  it('hides the close control when the decision cannot be dismissed', () => {
    render(
      <Modal isOpen onClose={vi.fn()} title="Pick one" dismissible={false}>
        <p>Body</p>
      </Modal>,
    );
    expect(screen.queryByRole('button', { name: 'Close dialog' })).not.toBeInTheDocument();
  });

  it('ignores Esc when not dismissible', async () => {
    const onClose = vi.fn();
    render(
      <Modal isOpen onClose={onClose} title="Pick one" dismissible={false}>
        <p>Body</p>
      </Modal>,
    );

    await userEvent.keyboard('{Escape}');
    expect(onClose).not.toHaveBeenCalled();
  });

  it('carries the attributes the transition CSS keys off', () => {
    render(<ModalHarness />);
    const dialog = screen.getByRole('dialog', { hidden: true });

    // Without these the open animates and the close snaps.
    expect(dialog).toHaveAttribute('data-cafera-dialog');
    expect(dialog).toHaveAttribute('data-dialog-variant', 'center');
  });
});

describe('Sheet', () => {
  it('locks scrolling and exposes its side to the transition CSS', () => {
    const { unmount } = render(
      <Sheet isOpen onClose={vi.fn()} title="Filters" side="bottom">
        <p>Filter body</p>
      </Sheet>,
    );

    const dialog = screen.getByRole('dialog', { hidden: true });
    expect(dialog).toHaveAttribute('data-dialog-variant', 'bottom');
    expect(getScrollLockCount()).toBe(1);

    unmount();
    expect(getScrollLockCount()).toBe(0);
  });

  it('keeps the lock held while a second dialog is stacked on top', () => {
    const sheet = render(
      <Sheet isOpen onClose={vi.fn()} title="Filters">
        <p>Filter body</p>
      </Sheet>,
    );
    const modal = render(<ModalHarness />);

    expect(getScrollLockCount()).toBe(2);

    // Closing the top one must not unfreeze the page underneath.
    modal.unmount();
    expect(getScrollLockCount()).toBe(1);
    expect(document.body.style.overflow).toBe('hidden');

    sheet.unmount();
    expect(getScrollLockCount()).toBe(0);
  });
});

describe('ConfirmDialog', () => {
  it('names the action rather than saying OK', () => {
    render(
      <ConfirmDialog
        isOpen
        title="Delete this recipe?"
        description="This cannot be undone."
        confirmLabel="Delete recipe"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    // "OK" forces the user to re-read the question to know what they agreed to.
    expect(screen.getByRole('button', { name: 'Delete recipe' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^ok$/i })).not.toBeInTheDocument();
  });

  it('cannot be dismissed while the action is in flight', async () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        isOpen
        isPending
        title="Delete this recipe?"
        description="This cannot be undone."
        confirmLabel="Delete recipe"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />,
    );

    await userEvent.keyboard('{Escape}');
    // Closing mid-flight leaves the user unsure whether it completed.
    expect(onCancel).not.toHaveBeenCalled();
  });
});
