import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end and cross-browser configuration.
 *
 * All three engines are run, not just Chromium, because the features CAFERA
 * leans on diverge most at the edges: `@starting-style` and
 * `transition-behavior: allow-discrete` for dialog transitions, `100dvh` and
 * `env(safe-area-inset-*)` on iOS Safari, and the Screen Wake Lock API in Brew
 * Mode. A suite that only proves Chromium works proves very little about the
 * half of the spec that exists because Safari behaves differently.
 */
const PORT = Number(process.env.PLAYWRIGHT_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  /* A test that only passes sometimes is worse than a failing one, so an
     accidental .only never reaches CI. */
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? [['html'], ['list']] : 'list',

  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    /* iOS Safari specifically: 100dvh, safe areas and the bottom nav are all
       things that only misbehave on a real mobile WebKit viewport. */
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  ],

  /* Tests run against a production build. A dev build has different CSS
     delivery and different hydration timing, so passing there would not tell us
     the shipped artefact works. */
  webServer: {
    command: `npm run build && npm run start -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});
