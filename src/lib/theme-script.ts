import { createHash } from 'node:crypto';
import { STORAGE_KEYS } from './storage';

/**
 * The pre-paint theme script, as a string.
 *
 * It lives here rather than inline in the component so that exactly one copy of
 * the text exists: the component renders it, and `next.config.ts` hashes it for
 * the Content-Security-Policy. If those two ever diverge by a single byte the
 * browser blocks the script and every dark-mode visitor gets a flash of cream,
 * so there must not be two copies to diverge.
 *
 * Why it has to be inline and blocking at all: any React-based approach — an
 * effect, a context, a client component — runs after first paint. There is no
 * way to avoid the flash other than executing synchronously before the body
 * renders.
 */
export const THEME_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem('${STORAGE_KEYS.theme}');
    var theme = stored === 'light' || stored === 'dark' ? stored : null;
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

/**
 * The CSP source expression for the script above.
 *
 * The hash is taken over the exact bytes the browser will see between the
 * script tags — no surrounding whitespace, no re-indentation. This is why the
 * component must render `THEME_SCRIPT` verbatim rather than a template that
 * happens to produce the same code.
 */
export function themeScriptHash(): string {
  const digest = createHash('sha256').update(THEME_SCRIPT, 'utf8').digest('base64');
  return `'sha256-${digest}'`;
}
