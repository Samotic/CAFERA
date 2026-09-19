import { THEME_SCRIPT } from '@/lib/theme-script';

/**
 * Resolves the theme before the browser paints anything.
 *
 * This has to be a blocking inline script in `<head>`. Any React-based approach
 * — an effect, a context, a client component — runs after the first paint, which
 * means a dark-mode user would see a flash of cream first.
 *
 * The script text comes from `@/lib/theme-script` because `next.config.ts`
 * hashes that same constant for the CSP. Rendering anything other than
 * `THEME_SCRIPT` verbatim — even a re-indented copy — changes the bytes, breaks
 * the hash, and the browser blocks the script silently.
 */
export function ThemeScript() {
  return (
    <script
      // Build-time constant with no interpolated user input; the only values
      // substituted are our own storage-key literals.
      dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
    />
  );
}
