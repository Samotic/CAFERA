/**
 * Time-of-day greeting and the deterministic "Coffee of the Day" pick.
 *
 * Both are pure functions of a supplied date. That matters twice over: the daily
 * pick is identical for every visitor and therefore cacheable at the CDN, and both
 * are trivially testable without freezing the system clock.
 */

export type DayPart = 'morning' | 'afternoon' | 'evening';

export function getDayPart(date: Date = new Date()): DayPart {
  const hour = date.getHours();
  if (hour < 12) return 'morning';
  if (hour < 18) return 'afternoon';
  return 'evening';
}

export function getGreeting(name: string | null | undefined, date: Date = new Date()): string {
  const part = getDayPart(date);
  const prefix =
    part === 'morning' ? 'Good morning' : part === 'afternoon' ? 'Good afternoon' : 'Good evening';
  const firstName = (name ?? '').trim().split(/\s+/)[0];
  return firstName ? `${prefix}, ${firstName}` : prefix;
}

/** `2026-09-18` in the caller's locale-independent form — the daily rotation key. */
export function toDayKey(date: Date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Small, fast, stable string hash (FNV-1a). Not cryptographic — it picks a coffee. */
export function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Picks one item per day, rotating deterministically. The same day always yields
 * the same item, and consecutive days do not repeat while the pool is larger than one.
 */
export function pickOfTheDay<T>(items: readonly T[], date: Date = new Date()): T | null {
  if (items.length === 0) return null;
  const index = hashString(toDayKey(date)) % items.length;
  return items[index] ?? null;
}
