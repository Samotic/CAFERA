import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getScrollLockCount, lockBodyScroll, unlockBodyScroll } from './useScrollLock';

/**
 * The scroll lock is the half of a modal that the platform does not supply, and
 * every one of its failure modes is silent: the page still works, it just
 * scrolls when it should not, or jumps sideways, or throws the reader back to
 * the top. None of that raises an error, so it is asserted here instead.
 */

function resetLock(): void {
  // Drain any count left by a failed test so cases stay independent.
  while (getScrollLockCount() > 0) unlockBodyScroll();
  document.body.removeAttribute('style');
  document.documentElement.removeAttribute('style');
}

beforeEach(() => {
  resetLock();
  vi.restoreAllMocks();
});

afterEach(resetLock);

describe('reference counting', () => {
  it('holds the lock until the last dialog closes', () => {
    lockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');

    // A second, stacked dialog opens.
    lockBodyScroll();
    expect(getScrollLockCount()).toBe(2);

    // The first one closes — the page must STAY locked.
    unlockBodyScroll();
    expect(getScrollLockCount()).toBe(1);
    expect(document.body.style.overflow).toBe('hidden');

    // Only now is it released.
    unlockBodyScroll();
    expect(getScrollLockCount()).toBe(0);
    expect(document.body.style.overflow).toBe('');
  });

  it('ignores an unlock that has no matching lock', () => {
    // A double cleanup must not drive the count negative, which would leave the
    // next real lock unable to release.
    unlockBodyScroll();
    unlockBodyScroll();
    expect(getScrollLockCount()).toBe(0);

    lockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');
    unlockBodyScroll();
    expect(document.body.style.overflow).toBe('');
  });
});

describe('scrollbar compensation', () => {
  it('re-adds the reclaimed scrollbar width so the page does not jump sideways', () => {
    // jsdom reports both as 0, so the scrollbar is simulated.
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1024);
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1009);

    lockBodyScroll();

    expect(document.body.style.paddingRight).toBe('15px');
    // Published for fixed elements, which body padding cannot reach.
    expect(document.documentElement.style.getPropertyValue('--scrollbar-width')).toBe('15px');

    unlockBodyScroll();

    expect(document.body.style.paddingRight).toBe('');
    expect(document.documentElement.style.getPropertyValue('--scrollbar-width')).toBe('');
  });

  it('adds no padding when there is no scrollbar to reclaim', () => {
    vi.spyOn(window, 'innerWidth', 'get').mockReturnValue(1024);
    vi.spyOn(document.documentElement, 'clientWidth', 'get').mockReturnValue(1024);

    lockBodyScroll();
    expect(document.body.style.paddingRight).toBe('');
    unlockBodyScroll();
  });
});

describe('style restoration', () => {
  it('restores pre-existing inline styles rather than clearing them', () => {
    // A page that already had inline body styles must get them back, not lose
    // them to the dialog that happened to open on top.
    document.body.style.overflow = 'scroll';
    document.body.style.paddingRight = '8px';

    lockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');

    unlockBodyScroll();
    expect(document.body.style.overflow).toBe('scroll');
    expect(document.body.style.paddingRight).toBe('8px');
  });
});

describe('iOS pinning', () => {
  it('pins the body and restores the scroll offset on release', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
    );
    vi.spyOn(window, 'scrollY', 'get').mockReturnValue(420);
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);

    lockBodyScroll();

    // Safari ignores overflow:hidden for touch scrolling, so the body is pinned.
    expect(document.body.style.position).toBe('fixed');
    expect(document.body.style.top).toBe('-420px');
    expect(document.body.style.width).toBe('100%');

    unlockBodyScroll();

    /* Pinning scrolls the document to the top as a side effect. Without this
       restore, every dialog close would throw the reader back to the top of the
       page — the single most noticeable bug in a hand-rolled scroll lock. */
    expect(scrollTo).toHaveBeenCalledWith(0, 420);
    expect(document.body.style.position).toBe('');

    vi.unstubAllGlobals();
  });

  it('uses overflow hidden on non-iOS, leaving the document scrolled where it is', () => {
    vi.spyOn(navigator, 'userAgent', 'get').mockReturnValue(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120',
    );
    const scrollTo = vi.fn();
    vi.stubGlobal('scrollTo', scrollTo);

    lockBodyScroll();
    expect(document.body.style.overflow).toBe('hidden');
    expect(document.body.style.position).toBe('');

    unlockBodyScroll();
    // No pinning happened, so nothing needs restoring.
    expect(scrollTo).not.toHaveBeenCalled();

    vi.unstubAllGlobals();
  });
});
