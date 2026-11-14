/**
 * The "please allow ads" note for visitors with an ad blocker. Pure helpers; the browser checks live in
 * hooks/useAdBlocked.ts. The note is a polite request, never a wall: closing it hides it for a week.
 */

export const SUPPORT_NOTE_KEY = 'pokenow:support-note';
export const SNOOZE_MS = 7 * 24 * 60 * 60 * 1000;

/** Show the note unless it was closed less than a week ago. Bad or missing values count as "never closed". */
export function shouldShowSupportNote(closedAt: string | null, now: number): boolean {
  const t = Number(closedAt);
  if (!closedAt || !Number.isFinite(t) || t <= 0) return true;
  if (t > now) return true; // clock moved backwards or a junk value: don't hide forever
  return now - t >= SNOOZE_MS;
}

/** Bait element hidden by cosmetic filters (EasyList hides these class names). */
export const BAIT_CLASSES = 'adsbox ad-banner ad-placeholder pub_300x250 text-ad';

export interface BlockSignals {
  /** A request for the AdSense loader failed while online. */
  network: boolean;
  /** The bait element was hidden by an element-hiding filter. */
  cosmetic: boolean;
  /** The AdSense loader tag is on the page but never ran after the page finished loading. */
  script: boolean;
}

/** Any one signal is enough: different blockers trip different checks. */
export function isBlocked(s: BlockSignals | null): boolean {
  return Boolean(s && (s.network || s.cosmetic || s.script));
}
