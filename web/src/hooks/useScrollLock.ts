'use client';

import { useEffect } from 'react';

/**
 * Locks scrolling of the page behind a modal surface.
 *
 * `showModal()` makes the page inert to clicks and keyboard, but it does **not**
 * stop it scrolling. A wheel gesture or a flung touch over the backdrop still
 * moves the content underneath, which on a bottom sheet reads as a broken
 * component rather than a subtlety.
 *
 * Three things here are easy to get wrong and are the reason this is one shared
 * module rather than a few lines inside each dialog:
 *
 *  1. **Reference counting.** Two stacked dialogs closing one at a time must not
 *     release the lock when the first one closes. The count is module-scoped
 *     because the lock is a property of the document, not of a component.
 *
 *  2. **Scrollbar compensation.** Removing the scrollbar reclaims its width and
 *     the whole page jumps sideways. The width is measured and re-added as
 *     padding, and published as `--scrollbar-width` so fixed elements — the
 *     sticky header, the bottom nav — can compensate too.
 *
 *  3. **iOS.** Safari ignores `overflow: hidden` on the body for touch
 *     scrolling, so the page is pinned with `position: fixed` instead. That
 *     technique scrolls the document to the top as a side effect, so the offset
 *     is saved and restored — without which every dialog close throws the user
 *     back to the top of the page.
 */

let lockCount = 0;
let savedScrollY = 0;
let savedStyles: {
  overflow: string;
  position: string;
  top: string;
  width: string;
  paddingRight: string;
} | null = null;

/**
 * iPadOS reports itself as a Mac, so touch points are checked as well as the
 * platform string. A false positive here is harmless (the fixed-position
 * technique works everywhere); a false negative leaks scrolling on the exact
 * devices where it is most visible.
 */
function isIosSafari(): boolean {
  if (typeof navigator === 'undefined') return false;
  const isIosDevice = /iP(hone|ad|od)/.test(navigator.userAgent);
  const isIpadOs = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return isIosDevice || isIpadOs;
}

export function lockBodyScroll(): void {
  if (typeof document === 'undefined') return;

  lockCount += 1;
  if (lockCount > 1) return;

  const body = document.body;
  const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

  savedScrollY = window.scrollY;
  savedStyles = {
    overflow: body.style.overflow,
    position: body.style.position,
    top: body.style.top,
    width: body.style.width,
    paddingRight: body.style.paddingRight,
  };

  document.documentElement.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);

  if (isIosSafari()) {
    body.style.position = 'fixed';
    body.style.top = `-${savedScrollY}px`;
    body.style.width = '100%';
  } else {
    body.style.overflow = 'hidden';
  }

  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

export function unlockBodyScroll(): void {
  if (typeof document === 'undefined') return;
  if (lockCount === 0) return;

  lockCount -= 1;
  if (lockCount > 0) return;

  const body = document.body;
  const wasPinned = body.style.position === 'fixed';

  if (savedStyles) {
    body.style.overflow = savedStyles.overflow;
    body.style.position = savedStyles.position;
    body.style.top = savedStyles.top;
    body.style.width = savedStyles.width;
    body.style.paddingRight = savedStyles.paddingRight;
    savedStyles = null;
  }

  document.documentElement.style.removeProperty('--scrollbar-width');

  // Restoring `position` lets the document scroll again; put it back where it was.
  if (wasPinned) {
    window.scrollTo(0, savedScrollY);
  }
}

/** Declarative wrapper. The cleanup releases the lock even on an abrupt unmount. */
export function useScrollLock(isLocked: boolean): void {
  useEffect(() => {
    if (!isLocked) return;
    lockBodyScroll();
    return unlockBodyScroll;
  }, [isLocked]);
}

/** Exposed for tests: asserting the count is what proves stacking works. */
export function getScrollLockCount(): number {
  return lockCount;
}
