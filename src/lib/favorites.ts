/**
 * Pinned ("favorite") spots, stored only in this browser.
 *
 * The list is a plain array of hotspot ids in localStorage. Keeping the pure
 * parsing/order helpers here makes them testable without a DOM; the React hook
 * in `hooks/useFavorites.ts` is the only part that touches storage.
 */

export const FAVORITES_STORAGE_KEY = 'pokenow:favorites';

/** Reads a stored id list defensively. Corrupt or foreign values → empty list. */
export function parseFavorites(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const value: unknown = JSON.parse(raw);
    if (!Array.isArray(value)) return [];
    return [...new Set(value.filter((v): v is string => typeof v === 'string' && v.length > 0))];
  } catch {
    return [];
  }
}

/** Add or remove one id, preserving the order of the others. Never mutates. */
export function toggleFavorite(favorites: readonly string[], id: string): string[] {
  return favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id];
}

/**
 * Pinned items first, everything else in its original (ranked) order.
 * Stable: the relative order inside both groups is preserved, so the ranked
 * list keeps making sense after a pin is added or removed.
 */
export function pinFirst<T>(
  items: readonly T[],
  getId: (item: T) => string,
  pinned: ReadonlySet<string>,
): T[] {
  const first: T[] = [];
  const rest: T[] = [];
  for (const item of items) (pinned.has(getId(item)) ? first : rest).push(item);
  return [...first, ...rest];
}

/** Browser-only load. Returns an empty list when storage is blocked or corrupted. */
export function loadFavorites(): string[] {
  try {
    return parseFavorites(localStorage.getItem(FAVORITES_STORAGE_KEY));
  } catch {
    return [];
  }
}

/** Browser-only save. Silently ignores private mode / quota errors. */
export function saveFavorites(ids: readonly string[]): void {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(ids));
  } catch {
    /* state still works for this visit */
  }
}
