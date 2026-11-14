/**
 * Countdowns to recurring local-time events at a hotspot.
 *
 *  - Golden hour: every day 18:00–19:00 local
 *  - Raid Hour:   Wednesdays 18:00–19:00 local
 *  - Spotlight Hour: Tuesdays 18:00–19:00 local
 *
 * Computed on the local wall clock (see note in scoring.ts about DST nights).
 */

import type { LocalClock } from '../types';
import { WINDOWS } from './scoring';

const DAY = 86400;

export type EventTiming = { live: true; secondsLeft: number } | { live: false; secondsUntil: number };

/**
 * Next occurrence of the 18:00–19:00 window on `weekday` (0 = Sun … 6 = Sat),
 * or on any day when `weekday` is null.
 */
export function nextGoldenWindow(clock: LocalClock, weekday: number | null): EventTiming {
  const sod = clock.secondsOfDay;
  const { start, end } = WINDOWS.golden;
  const todayMatches = weekday === null || clock.weekday === weekday;

  if (todayMatches && sod >= start && sod < end) return { live: true, secondsLeft: end - sod };

  let days: number;
  if (weekday === null) {
    days = sod < start ? 0 : 1;
  } else {
    days = (weekday - clock.weekday + 7) % 7;
    if (days === 0 && sod >= start) days = 7;
  }
  return { live: false, secondsUntil: days * DAY + start - sod };
}
