/**
 * Cooldown Reference Guide data.
 *
 * ⚠️  UNOFFICIAL. The game operator has never published a cooldown table.
 * These values are a community-compiled chart that circulates widely; different
 * sources disagree by several minutes in the mid-range. The one point most
 * sources agree on is the ~2 hour maximum. Treat these as conservative
 * planning hints, not guarantees. PRs that improve sourcing are welcome.
 */

export interface CooldownStep {
  /** Upper bound of the distance band in km (inclusive). `Infinity` for the cap. */
  maxKm: number;
  /** Suggested wait in minutes. */
  minutes: number;
}

export const COOLDOWN_TABLE: readonly CooldownStep[] = [
  { maxKm: 1, minutes: 1 },
  { maxKm: 2, minutes: 1 },
  { maxKm: 4, minutes: 2 },
  { maxKm: 10, minutes: 8 },
  { maxKm: 12, minutes: 9 },
  { maxKm: 15, minutes: 11 },
  { maxKm: 30, minutes: 14 },
  { maxKm: 65, minutes: 22 },
  { maxKm: 81, minutes: 25 },
  { maxKm: 100, minutes: 35 },
  { maxKm: 250, minutes: 45 },
  { maxKm: 500, minutes: 64 },
  { maxKm: 750, minutes: 82 },
  { maxKm: 1000, minutes: 100 },
  { maxKm: 1250, minutes: 118 },
  { maxKm: Infinity, minutes: 120 },
];

/** After this long without a cooldown-triggering action you can act anywhere. */
export const MAX_COOLDOWN_MINUTES = 120;

/** Moves shorter than this are treated as staying in place (no wait). */
const SAME_PLACE_KM = 0.1;

/** Conservative lookup: picks the first band whose upper bound covers `km`. */
export function suggestedCooldownMinutes(km: number): number {
  if (km <= SAME_PLACE_KM) return 0;
  const step = COOLDOWN_TABLE.find((s) => km <= s.maxKm);
  return step ? step.minutes : MAX_COOLDOWN_MINUTES;
}
