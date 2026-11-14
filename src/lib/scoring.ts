/**
 * PokeSpot recommendation engine.
 *
 * Every hotspot is classified into exactly one tier based on its LOCAL time:
 *
 *   Tier 1  🔥 golden    18:00 ≤ t < 19:00   (Raid Hour = Wed, Spotlight Hour = Tue)
 *   Tier 2  🟢 peak      11:00 ≤ t < 20:00   (and not golden)
 *   Tier 3  ⏳ upcoming  everything else      (20:00 → 10:59)
 *
 * Ranking (see `compareScored`):
 *   1. Lower tier number wins (golden > peak > upcoming).
 *   2. golden / peak: higher `popularity` wins.
 *   3. upcoming: the spot that reaches its next window (11:00 or 18:00) soonest wins,
 *      then higher `popularity`.
 *   4. `id` as a final deterministic tie-breaker (stable renders, stable tests).
 *
 * The engine is a pure function of (hotspots, instant) — no React, no globals —
 * so it is trivial to unit test and to reuse in a future API / bot.
 */

import type { Hotspot, LocalClock, ScoredHotspot, SpotStatus, Tier } from '../types';
import { getLocalClock } from './time';

const HOUR = 3600;
const DAY = 24 * HOUR;

/** Window boundaries in seconds-of-day. Ranges are half-open: [start, end). */
export const WINDOWS = {
  golden: { start: 18 * HOUR, end: 19 * HOUR },
  peak: { start: 11 * HOUR, end: 20 * HOUR },
} as const;

const TIER_RANK: Record<Tier, number> = { golden: 0, peak: 1, upcoming: 2 };

/** Seconds from `from` until the next occurrence of `target` (both seconds-of-day). 0 means "now". */
export function secondsUntil(target: number, from: number): number {
  return (((target - from) % DAY) + DAY) % DAY;
}

function inWindow(sod: number, w: { start: number; end: number }): boolean {
  return sod >= w.start && sod < w.end;
}

/** Tier for a given local clock. */
export function classify(clock: LocalClock): Tier {
  if (inWindow(clock.secondsOfDay, WINDOWS.golden)) return 'golden';
  if (inWindow(clock.secondsOfDay, WINDOWS.peak)) return 'peak';
  return 'upcoming';
}

const STATUS_BY_TIER: Record<Tier, SpotStatus> = {
  golden: 'raid-hour',
  peak: 'active',
  upcoming: 'quiet',
};

/**
 * Weekly in-game events that fall inside the golden window (local time).
 * Raid Hour: Wednesdays 18:00–19:00. Spotlight Hour: Tuesdays 18:00–19:00.
 * Event schedules are set by the game operator and can change — always check
 * official announcements for special weeks.
 */
function eventLabelFor(clock: LocalClock, tier: Tier): string | null {
  if (tier !== 'golden') return null;
  if (clock.weekday === 3) return 'Raid Hour';
  if (clock.weekday === 2) return 'Spotlight Hour';
  return 'Golden Time';
}

/** Enrich a single hotspot with live data for the instant `now`. */
export function scoreHotspot(hotspot: Hotspot, now: Date): ScoredHotspot {
  const clock = getLocalClock(now, hotspot.timeZone);
  const sod = clock.secondsOfDay;
  const tier = classify(clock);

  const untilPeak = secondsUntil(WINDOWS.peak.start, sod);
  const untilGolden = secondsUntil(WINDOWS.golden.start, sod);

  let secondsUntilNextWindow = 0;
  let nextWindow: ScoredHotspot['nextWindow'] = null;
  let secondsLeftInWindow = 0;

  if (tier === 'golden') {
    secondsLeftInWindow = WINDOWS.golden.end - sod;
  } else if (tier === 'peak') {
    secondsLeftInWindow = WINDOWS.peak.end - sod;
    // Before 18:00 the next milestone is the golden hour.
    if (sod < WINDOWS.golden.start) {
      secondsUntilNextWindow = untilGolden;
      nextWindow = 'golden';
    }
  } else {
    // Quiet: whichever window opens first. From 20:00–10:59 this is always 11:00,
    // but we compute it generically so custom windows keep working.
    if (untilPeak <= untilGolden) {
      secondsUntilNextWindow = untilPeak;
      nextWindow = 'peak';
    } else {
      secondsUntilNextWindow = untilGolden;
      nextWindow = 'golden';
    }
  }

  // NOTE: countdowns are computed on the local wall clock. On the night a DST
  // transition happens they can be off by the DST delta (usually 1h). The
  // tier/status itself is always correct because it is re-derived every tick.

  return {
    hotspot,
    clock,
    tier,
    status: STATUS_BY_TIER[tier],
    secondsUntilNextWindow,
    nextWindow,
    secondsLeftInWindow,
    eventLabel: eventLabelFor(clock, tier),
  };
}

/** Sort comparator implementing the ranking rules described at the top of the file. */
export function compareScored(a: ScoredHotspot, b: ScoredHotspot): number {
  const tierDiff = TIER_RANK[a.tier] - TIER_RANK[b.tier];
  if (tierDiff !== 0) return tierDiff;

  if (a.tier === 'upcoming') {
    const soonest = a.secondsUntilNextWindow - b.secondsUntilNextWindow;
    if (soonest !== 0) return soonest;
  }

  const pop = b.hotspot.popularity - a.hotspot.popularity;
  if (pop !== 0) return pop;

  return a.hotspot.id.localeCompare(b.hotspot.id);
}

/** Score and rank all hotspots. The first element is the "Best Raid Spot Now". */
export function rankHotspots(hotspots: readonly Hotspot[], now: Date): ScoredHotspot[] {
  return hotspots.map((h) => scoreHotspot(h, now)).sort(compareScored);
}

/** Popularity → letter grade used by the "density" chip. */
export function densityGrade(popularity: number): 'S' | 'A' | 'B' | 'C' {
  if (popularity >= 90) return 'S';
  if (popularity >= 75) return 'A';
  if (popularity >= 60) return 'B';
  return 'C';
}
