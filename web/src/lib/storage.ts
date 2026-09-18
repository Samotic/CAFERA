/**
 * The single audited entry point to web storage.
 *
 * Three rules hold everywhere in CAFERA:
 *
 * 1. Nothing security-relevant is stored here. The access token lives in memory
 *    and the refresh token in an httpOnly cookie, because any XSS can read
 *    localStorage and a stored token is a stolen account. The key list below is
 *    exhaustive and contains only conveniences.
 * 2. Every access is wrapped. Private mode, blocked site data and quota
 *    exhaustion all throw on access rather than returning null, and a settings
 *    read must never be able to take down a page.
 * 3. Every read tolerates absence. Values are hints that make the UI nicer on a
 *    return visit; the server is the source of truth for anything that matters.
 */

export const STORAGE_KEYS = {
  /** Mirrors `user.hasOnboarded` for instant paint; the server value wins. */
  onboarded: 'cafera:onboarded',
  /** Resolved before first paint by the inline theme script. */
  theme: 'cafera:theme',
  unitSystem: 'cafera:unit-system',
  reducedMotion: 'cafera:reduced-motion',
  recentSearches: 'cafera:recent-searches',
  /** The one-time brand intro animation. */
  introSeen: 'cafera:intro-seen',
  /** Ticked ingredients, keyed per recipe slug. */
  ingredientChecks: 'cafera:ingredients',
  /** Autosaved custom-recipe draft. */
  customRecipeDraft: 'cafera:custom-draft',
  servings: 'cafera:servings',
  brewMuted: 'cafera:brew-muted',
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

function isBrowser(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

export function readStorage(key: StorageKey): string | null {
  if (!isBrowser()) return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: StorageKey, value: string): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Quota exceeded or storage blocked. A lost convenience is not an error
    // worth surfacing to the person using the site.
  }
}

export function removeStorage(key: StorageKey): void {
  if (!isBrowser()) return;
  try {
    window.localStorage.removeItem(key);
  } catch {
    /* see writeStorage */
  }
}

/**
 * JSON helpers. A corrupt or hand-edited value returns the fallback and clears
 * itself, so one bad entry cannot wedge a feature on every future visit.
 */
export function readJson<T>(key: StorageKey, fallback: T): T {
  const raw = readStorage(key);
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    removeStorage(key);
    return fallback;
  }
}

export function writeJson(key: StorageKey, value: unknown): void {
  try {
    writeStorage(key, JSON.stringify(value));
  } catch {
    /* value contained a cycle — nothing useful to store */
  }
}
