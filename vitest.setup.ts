import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

/**
 * jsdom implements the DOM, not the browser. The three gaps below are the ones
 * CAFERA's components actually depend on, so each is stubbed rather than worked
 * around inside the components themselves — production code should never carry
 * branches that exist only to satisfy a test environment.
 */

afterEach(() => {
  cleanup();
});

/* Used by the reduced-motion and breakpoint hooks. jsdom has no layout engine,
   so every query resolves to "no match" unless a test overrides it. */
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

/**
 * Modal and Sheet are built on native `<dialog>`, which jsdom declares but does
 * not implement.
 *
 * The Escape behaviour is stubbed as well as `showModal`/`close`, because
 * without it a test asserting "Esc closes the dialog" simply observes nothing
 * happening — and its mirror image, "Esc does NOT close a non-dismissible
 * dialog", passes vacuously for the same reason. A fixture that makes a test
 * pass for the wrong reason is worse than a missing fixture.
 *
 * Real Esc handling, focus trapping and focus restoration are the platform's
 * job and are verified in the Playwright suite, which runs a real browser.
 */
if (!HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
    this.open = true;
  };
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.open = false;
    this.dispatchEvent(new Event('close'));
  };

  // Escape on an open modal dialog fires `cancel`, which is what our components
  // listen for — `close` alone would bypass the dismissible check entirely.
  document.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    const openDialog = document.querySelector<HTMLDialogElement>('dialog[open]');
    if (!openDialog) return;
    openDialog.dispatchEvent(new Event('cancel', { cancelable: true, bubbles: false }));
  });
}

/* Any component that lazily reveals content on scroll. */
if (!('IntersectionObserver' in window)) {
  Object.defineProperty(window, 'IntersectionObserver', {
    writable: true,
    value: vi.fn().mockImplementation(() => ({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
      takeRecords: vi.fn().mockReturnValue([]),
    })),
  });
}
