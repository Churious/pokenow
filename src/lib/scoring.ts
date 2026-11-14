/**
 * PokeNow recommendation engine.
 *
 * Every hotspot is classified into exactly one tier based on its LOCAL time:
 *
 *   Tier 1  🔥 golden    18:00 ≤ t < 19:00   (Raid Hour = Wed, Spotlight Hour = Thu)
 *   Tier 2  🟢 peak      11:00 ≤ t < 20:00   (and not golden)
 *   Tier 3  ⏳ upcoming  everything else      (20:00 → 10:59)
 *
 * Ranking (see `compareScored`):
 *   1. Lower tier number wins (golden > peak > upcoming).
 *   2. upcoming: the spot that reaches its next window (11:00 or 18:00) soonest wins.
 *   3. Still tied (e.g. Seoul / Osaka / Tokyo share a clock): the spot closer to the
 *      player's last action, when one is set.
 *   4. `id` as a final deterministic tie-breaker (stable renders, stable tests).
 *   There is deliberately no "popularity" weight: we have no measured data for it.
 *
 * Cooldown / soft-ban aware mode (TravelState ≠ free):
 *   For every spot we compute the distance from the player's last action and the
 *   remaining cooldown wait. The spot is then judged by the tier it will be in
 *   *when the player can safely act there* (`plan.arrivalTier`), not right now.
 *   A window that would have less than 15 minutes left on arrival is not counted.
 *   Inside a tier, shorter waits win (in 10-minute buckets, so near-equal waits
 *   fall through to the rules below). In free mode every wait is 0, so the
 *   ranking is exactly the rules above.
 *
 * The engine is a pure function of (hotspots, instant) — no React, no globals —
 * so it is trivial to unit test and to reuse in a future API / bot.
 */

import type {
  EventCalendar,
  Hotspot,
  LocalClock,
  ScoredHotspot,
  SpotStatus,
  Tier,
  TravelPlan,
  TravelState,
} from '../types';
import { getLocalClock } from './time';
import { distanceKm } from './geo';
import { MAX_COOLDOWN_MINUTES, suggestedCooldownMinutes } from '../data/cooldowns';

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
 * Raid Hour: Wednesdays 18:00–19:00. Spotlight Hour: Thursdays 18:00–19:00 (moved from
 * Tuesday on 18 June 2026: https://pokemongo.com/news/choose-your-path-forever-forward-2026).
 * Event schedules are set by the game operator and can change — always check
 * official announcements for special weeks.
 */
/** Day numbers (0 = Sunday) of the weekly 18:00–19:00 events. */
export const RAID_HOUR_WEEKDAY = 3;
export const SPOTLIGHT_WEEKDAY = 4;

function eventLabelFor(clock: LocalClock, tier: Tier, calendar?: EventCalendar): string | null {
  if (tier !== 'golden') return null;
  // With the feed we know the real dates: skipped weeks, extra Raid Hours on other days.
  if (calendar) {
    if (calendar.raidHour.has(clock.ymd)) return 'Raid Hour';
    if (calendar.spotlight.has(clock.ymd)) return 'Spotlight Hour';
    return 'Golden Time';
  }
  if (clock.weekday === RAID_HOUR_WEEKDAY) return 'Raid Hour';
  if (clock.weekday === SPOTLIGHT_WEEKDAY) return 'Spotlight Hour';
  return 'Golden Time';
}

type LiveFields = Omit<ScoredHotspot, 'plan'>;

/** Live data for a hotspot at instant `at` (no travel considerations). */
function liveAt(hotspot: Hotspot, now: Date, calendar?: EventCalendar): LiveFields {
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
    eventLabel: eventLabelFor(clock, tier, calendar),
  };
}

/** A window must stay open at least this long after arrival to be worth travelling for. */
export const MIN_USABLE_SECONDS = 15 * 60;
const WAIT_BUCKET_SECONDS = 10 * 60;

/** Remaining cooldown (seconds) before acting at `spot`, given the travel state. */
export function cooldownWait(
  spot: Pick<Hotspot, 'lat' | 'lng'>,
  travel: TravelState,
  now: Date,
): { distanceKm: number | null; waitSeconds: number } {
  if (travel.mode === 'free') return { distanceKm: null, waitSeconds: 0 };
  const km = distanceKm(travel.origin, spot);
  const elapsed = Math.max(0, (now.getTime() - travel.lastActionAt) / 1000);
  const need = suggestedCooldownMinutes(km) * 60;
  return { distanceKm: km, waitSeconds: Math.max(0, Math.ceil(need - elapsed)) };
}

/** Seconds until the whole cooldown (2h cap) has expired; 0 when free. */
export function secondsUntilFullyFree(travel: TravelState, now: Date): number {
  if (travel.mode === 'free') return 0;
  const elapsed = (now.getTime() - travel.lastActionAt) / 1000;
  return Math.max(0, Math.ceil(MAX_COOLDOWN_MINUTES * 60 - elapsed));
}

function planFor(
  hotspot: Hotspot,
  live: LiveFields,
  travel: TravelState,
  now: Date,
  calendar?: EventCalendar,
): TravelPlan {
  const { distanceKm: km, waitSeconds } = cooldownWait(hotspot, travel, now);
  const atArrival = waitSeconds === 0 ? live : liveAt(hotspot, new Date(now.getTime() + waitSeconds * 1000), calendar);
  // When travelling, a window about to close is not worth the trip.
  const minUsable = waitSeconds === 0 ? 0 : MIN_USABLE_SECONDS;

  let arrivalTier = atArrival.tier;
  let untilWindow = atArrival.secondsUntilNextWindow;
  if (arrivalTier !== 'upcoming' && atArrival.secondsLeftInWindow < minUsable) {
    // golden ending soon → still inside peak (19:xx); peak ending soon → wait for tomorrow's 11:00.
    if (arrivalTier === 'golden') {
      arrivalTier = 'peak';
    } else {
      arrivalTier = 'upcoming';
      untilWindow = secondsUntil(WINDOWS.peak.start, atArrival.clock.secondsOfDay);
    }
  }

  return {
    distanceKm: km,
    waitSeconds,
    arrivalTier,
    arrivalEventLabel: arrivalTier === 'golden' ? atArrival.eventLabel : null,
    secondsUntilUsable: waitSeconds + (arrivalTier === 'upcoming' ? untilWindow : 0),
  };
}

/** Enrich a single hotspot with live data for `now`, plus a travel plan. */
export function scoreHotspot(
  hotspot: Hotspot,
  now: Date,
  travel: TravelState = { mode: 'free' },
  calendar?: EventCalendar,
): ScoredHotspot {
  const live = liveAt(hotspot, now, calendar);
  return { ...live, plan: planFor(hotspot, live, travel, now, calendar) };
}

/** Sort comparator implementing the ranking rules described at the top of the file. */
export function compareScored(a: ScoredHotspot, b: ScoredHotspot): number {
  const tierDiff = TIER_RANK[a.plan.arrivalTier] - TIER_RANK[b.plan.arrivalTier];
  if (tierDiff !== 0) return tierDiff;

  if (a.plan.arrivalTier === 'upcoming') {
    const soonest = a.plan.secondsUntilUsable - b.plan.secondsUntilUsable;
    if (soonest !== 0) return soonest;
  } else {
    const bucket = (s: ScoredHotspot) => Math.ceil(s.plan.waitSeconds / WAIT_BUCKET_SECONDS);
    const waitDiff = bucket(a) - bucket(b);
    if (waitDiff !== 0) return waitDiff;
  }

  if (a.plan.distanceKm !== null && b.plan.distanceKm !== null) {
    const nearer = a.plan.distanceKm - b.plan.distanceKm;
    if (nearer !== 0) return nearer;
  }

  return a.hotspot.id.localeCompare(b.hotspot.id);
}

/** Score and rank all hotspots. The first element is the "Best Raid Spot Now". */
export function rankHotspots(
  hotspots: readonly Hotspot[],
  now: Date,
  travel: TravelState = { mode: 'free' },
  calendar?: EventCalendar,
): ScoredHotspot[] {
  return hotspots.map((h) => scoreHotspot(h, now, travel, calendar)).sort(compareScored);
}
