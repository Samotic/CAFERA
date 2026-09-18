import { expect, test, type Page } from '@playwright/test';

/**
 * Cross-browser verification of the two things a native `<dialog>` does not
 * supply: the body scroll lock, and an exit transition.
 *
 * This suite exists because those features have the shallowest support history
 * of anything in the design system. `@starting-style` and
 * `transition-behavior: allow-discrete` arrived at different times in each
 * engine, and the failure mode is not an error — the dialog simply snaps shut
 * instead of animating, which no unit test can see.
 *
 * The mobile menu Sheet in the header is the target: it is reachable without a
 * session, and it is the component where a leaking scroll lock is most obvious.
 */

test.use({ viewport: { width: 390, height: 780 } });

async function openMenu(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: 'Open menu' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test.describe('Sheet — scroll lock', () => {
  test('locks the page behind it and restores scrolling on close', async ({ page }) => {
    await page.goto('/');

    const overflowBefore = await page.evaluate(() => getComputedStyle(document.body).overflow);

    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    const locked = await page.evaluate(() => ({
      overflow: document.body.style.overflow,
      position: document.body.style.position,
    }));

    // One of the two techniques must be in force: overflow on desktop engines,
    // position pinning on iOS where Safari ignores overflow for touch.
    expect(locked.overflow === 'hidden' || locked.position === 'fixed').toBe(true);

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    await expect
      .poll(async () => page.evaluate(() => getComputedStyle(document.body).overflow))
      .toBe(overflowBefore);
  });

  test('does not scroll the page while the sheet is open', async ({ page, isMobile }) => {
    // A wheel gesture is the thing being asserted, and emulated touch devices
    // have no wheel. The lock itself is covered for them by the test above.
    test.skip(Boolean(isMobile), 'wheel events do not exist on a touch device');

    await page.goto('/');
    await page.evaluate(() => window.scrollTo({ top: 200, behavior: 'instant' }));
    const before = await page.evaluate(() => window.scrollY);

    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // A wheel gesture over the backdrop must not move the content behind it.
    await page.mouse.move(195, 400);
    await page.mouse.wheel(0, 600);
    await page.waitForTimeout(150);

    const during = await page.evaluate(() => window.scrollY);
    expect(Math.abs(during - before)).toBeLessThan(10);
  });

  test('returns the reader to where they were after closing', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => window.scrollTo({ top: 300, behavior: 'instant' }));
    const before = await page.evaluate(() => window.scrollY);

    await page.getByRole('button', { name: 'Open menu' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    /* The iOS pinning technique scrolls the document to the top as a side
       effect; without the restore, every close would throw the reader back to
       the top of the page. */
    await expect.poll(async () => page.evaluate(() => window.scrollY)).toBeCloseTo(before, -1);
  });
});

test.describe('Sheet — platform behaviour from the native element', () => {
  test('Escape closes it', async ({ page }) => {
    await openMenu(page);
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('a backdrop click closes it, a click inside does not', async ({ page }) => {
    await openMenu(page);

    // Inside the panel: must stay open.
    await page.getByRole('heading', { name: 'Menu' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // The backdrop: the far edge away from the right-anchored panel.
    await page.mouse.click(10, 400);
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('traps focus inside the panel', async ({ page }) => {
    await openMenu(page);

    // Tab well past the number of controls in the sheet; focus must never
    // escape to the page behind. This is the platform's job, and asserting it
    // is how we know showModal() is genuinely being used.
    for (let i = 0; i < 12; i += 1) {
      await page.keyboard.press('Tab');
    }

    const insideDialog = await page.evaluate(() => {
      const dialog = document.querySelector('dialog[open]');
      return Boolean(dialog && document.activeElement && dialog.contains(document.activeElement));
    });

    expect(insideDialog).toBe(true);
  });

  test('restores focus to the trigger on close', async ({ page }) => {
    await page.goto('/');
    const trigger = page.getByRole('button', { name: 'Open menu' });

    /* Opened from the keyboard, not by clicking. That is deliberate: Safari
       follows the macOS convention of NOT focusing a button on click, so a
       mouse user there never had focus on the trigger and nothing is lost when
       the dialog closes. The case this assertion exists for is the keyboard
       user, who did have focus there and would otherwise be dumped on <body>
       at the top of the page. */
    await trigger.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();

    await expect(page.getByRole('button', { name: 'Open menu' })).toBeFocused();
  });
});

test.describe('Sheet — transitions', () => {
  test('declares transitions on display and overlay so the exit can animate', async ({ page }) => {
    await openMenu(page);

    const transition = await page.evaluate(() => {
      const dialog = document.querySelector('dialog[open]');
      if (!dialog) return null;
      const style = getComputedStyle(dialog);
      return {
        property: style.transitionProperty,
        behavior: style.transitionBehavior,
        duration: style.transitionDuration,
      };
    });

    expect(transition).not.toBeNull();

    /* Where `allow-discrete` is supported, `display` and `overlay` must be in
       the transition list — without `overlay` the element leaves the top layer
       immediately and the close is instant no matter what else animates.

       Where it is NOT supported the declaration is dropped by the parser, the
       dialog opens and closes instantly, and that is correct-but-unanimated
       rather than broken. Both outcomes are acceptable; a snapping close in a
       browser that DOES support it is not. */
    const supportsDiscrete = await page.evaluate(() =>
      CSS.supports('transition-behavior', 'allow-discrete'),
    );

    if (supportsDiscrete) {
      expect(transition!.property).toContain('display');
      expect(transition!.property).toContain('overlay');
    }
  });

  test('still opens and closes where the transition features are unsupported', async ({ page }) => {
    // The degradation path: whatever the engine supports, the sheet must work.
    await openMenu(page);
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });

  test('honours prefers-reduced-motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await openMenu(page);

    const { transform, duration } = await page.evaluate(() => {
      const dialog = document.querySelector('dialog[open]')!;
      const style = getComputedStyle(dialog);
      return { transform: style.transform, duration: style.transitionDuration };
    });

    // No travel, and effectively no duration — the dialog still appears.
    expect(transform === 'none' || transform === 'matrix(1, 0, 0, 1, 0, 0)').toBe(true);
    expect(duration.split(',').every((d) => parseFloat(d) <= 0.01)).toBe(true);
  });
});
