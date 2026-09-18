import { STORAGE_KEYS } from '@/lib/storage';

/**
 * Resolves the theme before the browser paints anything.
 *
 * This has to be a blocking inline script in <head>. Any React-based approach —
 * an effect, a context, a client component — runs after the first paint, which
 * means a dark-mode user would see a flash of cream first. There is no way to
 * avoid that flash other than executing synchronously before the body renders.
 *
 * The script is deliberately tiny and dependency-free, and it fails open: if
 * storage throws, the page falls back to the `color-scheme: light dark` default
 * in globals.css, which still respects the OS setting.
 */
const themeScript = `
(function () {
  try {
    var stored = localStorage.getItem('${STORAGE_KEYS.theme}');
    var theme = stored === 'light' || stored === 'dark' ? stored : null;
    if (!theme && stored !== 'system') theme = null;
    var root = document.documentElement;
    if (theme) {
      root.setAttribute('data-theme', theme);
    } else {
      root.removeAttribute('data-theme');
    }
    if (localStorage.getItem('${STORAGE_KEYS.reducedMotion}') === 'true') {
      root.setAttribute('data-reduced-motion', 'true');
    }
  } catch (e) {}
})();
`.trim();

export function ThemeScript({ nonce }: { nonce?: string }) {
  return (
    <script
      nonce={nonce}
      // The content is a build-time constant with no interpolated user input;
      // the only values substituted are our own storage-key literals.
      dangerouslySetInnerHTML={{ __html: themeScript }}
    />
  );
}
