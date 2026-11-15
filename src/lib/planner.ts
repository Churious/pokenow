/**
 * Cooldown route planner ("Raid Hour chase").
 *
 * `scoring.ts` answers "where should I play right now?". This module answers the
 * follow-up question: "in what order should I play the next few spots?".
 *
 * The plan follows how players actually chase raid windows: play a spot for its whole
 * window, then wait out the cooldown and move to a spot whose Raid Hour is just
 * starting — typically two to three time zones further west.
 *
 * Assumptions (kept explicit because they drive the output):
 *  - The first stop is the reachable spot (with the player's remaining cooldown
 *    from `scoring.ts`) whose Raid Hour is over soonest — usually the hero
 *    recommendation, but at 17:55 in Seoul it is Seoul rather than a peak spot
 *    whose Raid Hour is six hours away.
 *  - A stop lasts until its window is used up (`leaveTimeFor`): a golden-hour
 *    stop until 19:00 local; a peak stop reached before 18:00 stays through that
 *    day's golden hour (until 19:00); a peak stop reached after 19:00 until the
 *    peak ends at 20:00. The last action is assumed at the end of that stay.
 *  - Each following leg waits `cooldown(distance)` from the previous stop.
 *  - Later stops must arrive inside a golden/peak window with at least
 *    `MIN_USABLE_SECONDS` left, within `ROUTE_HORIZON_SECONDS`. A stop that still
 *    gets a Raid Hour beats one that doesn't; among those, the Raid Hour that is
 *    over soonest wins (`isBetterStop`).
 *  - A spot is never repeated.
 *
 * Pure functions only — no React, no globals — so the route is unit-testable and
 * could be reused by an API or bot later.
 */

import type { EventCalendar, Hotspot, ScoredHotspot, Tier } from '../types';
import { suggestedCooldownMinutes } from '../data/cooldowns';
import { distanceKm } from './geo';
import { MIN_USABLE_SECONDS, scoreHotspot, WINDOWS } from './scoring';

/** Long enough for a chain of Raid Hours: ~1 h of play + up to 2 h of cooldown per hop. */
export const ROUTE_HORIZON_SECONDS = 12 * 60 * 60;

/** Default number of stops in a route. */
export const MAX_ROUTE_STOPS = 3;

/** Cooldown waits are compared in 10-minute buckets, like the main ranking. */
const WAIT_BUCKET_SECONDS = 10 * 60;

const TIER_RANK: Record<Tier, number> = { golden: 0, peak: 1, upcoming: 2 };

export interface RouteStop {
  hotspot: Hotspot;
  /** Live state at the moment the player can act there (only the live fields are meaningful). */
  atArrival: ScoredHotspot;
  /** When the player can start playing at this stop. */
  arriveAt: Date;
  /** When the player is assumed to leave (window close included). */
  leaveAt: Date;
  /** Distance from the previous stop, or from the last action for the first stop. */
  distanceKm: number | null;
  /** Remaining cooldown before this stop (0 = play immediately). */
  waitSeconds: number;
}

export interface Route {
  stops: RouteStop[];
  /** Seconds from `now` until the end of the last stop. */
  totalSeconds: number;
  /** Sum of all legs that have a known distance. */
  totalDistanceKm: number;
}

export interface PlanOptions {
  maxStops?: number;
  horizonSeconds?: number;
  /** Real Raid Hour / Spotlight Hour dates for the labels at each stop. */
  calendar?: EventCalendar;
}

const emptyRoute = (): Route => ({ stops: [], totalSeconds: 0, totalDistanceKm: 0 });

/**
 * When the player leaves a stop: once its window is used up. Golden hour → its end (19:00 local).
 * Peak before 18:00 → stay through that day's golden hour (19:00). Peak after 19:00 → the peak's end (20:00).
 */
export function leaveTimeFor(arriveAt: Date, atArrival: ScoredHotspot): Date {
  const sod = atArrival.clock.secondsOfDay;
  let staySeconds: number;
  if (atArrival.tier === 'golden' || atArrival.tier === 'upcoming') {
    staySeconds = atArrival.secondsLeftInWindow;
  } else if (sod < WINDOWS.golden.start) {
    staySeconds = WINDOWS.golden.end - sod;
  } else {
    staySeconds = atArrival.secondsLeftInWindow;
  }
  return new Date(arriveAt.getTime() + Math.max(0, staySeconds) * 1000);
}

/**
 * Build a cooldown-aware itinerary from the ranked list.
 * `ranked` must come from `rankHotspots(hotspots, now, travel)` so the first
 * stop's `plan` fields match the player's current cooldown.
 */
export function planRoute(ranked: readonly ScoredHotspot[], now: Date, options: PlanOptions = {}): Route {
  const maxStops = options.maxStops ?? MAX_ROUTE_STOPS;
  const horizonSeconds = options.horizonSeconds ?? ROUTE_HORIZON_SECONDS;
  if (maxStops <= 0) return emptyRoute();

  // First stop: the spot (with the player's current cooldown) whose Raid Hour is used up soonest, so the chase
  // starts with the nearest Raid Hour instead of a peak spot whose Raid Hour is hours away.
  let first: RouteStop | null = null;
  for (const candidate of ranked) {
    if (candidate.plan.arrivalTier === 'upcoming') continue;
    const arriveAt = new Date(now.getTime() + candidate.plan.waitSeconds * 1000);
    const atArrival = scoreHotspot(candidate.hotspot, arriveAt, undefined, options.calendar);
    if (atArrival.tier === 'upcoming') continue;
    const stop: RouteStop = {
      hotspot: candidate.hotspot,
      atArrival,
      arriveAt,
      leaveAt: leaveTimeFor(arriveAt, atArrival),
      distanceKm: candidate.plan.distanceKm,
      waitSeconds: candidate.plan.waitSeconds,
    };
    if (!first || isBetterStop(stop, first)) first = stop;
  }
  if (!first) return emptyRoute();
  const stops: RouteStop[] = [first];
  const used = new Set([first.hotspot.id]);

  while (stops.length < maxStops) {
    const previous = stops[stops.length - 1];
    // The last cooldown-triggering action is assumed to happen when leaving the previous stop.
    const cursor = previous.leaveAt;
    let best: RouteStop | null = null;

    for (const candidate of ranked) {
      if (used.has(candidate.hotspot.id)) continue;

      const km = distanceKm(previous.hotspot, candidate.hotspot);
      const waitSeconds = suggestedCooldownMinutes(km) * 60;
      const arriveAt = new Date(cursor.getTime() + waitSeconds * 1000);
      if ((arriveAt.getTime() - now.getTime()) / 1000 > horizonSeconds) continue;

      const atArrival = scoreHotspot(candidate.hotspot, arriveAt, undefined, options.calendar);
      // Arriving outside a window, or just before it closes, is not worth a stop.
      if (atArrival.tier === 'upcoming' || atArrival.secondsLeftInWindow < MIN_USABLE_SECONDS) continue;

      const stop: RouteStop = {
        hotspot: candidate.hotspot,
        atArrival,
        arriveAt,
        leaveAt: leaveTimeFor(arriveAt, atArrival),
        distanceKm: km,
        waitSeconds,
      };
      if (!best || isBetterStop(stop, best)) best = stop;
    }

    if (!best) break;
    stops.push(best);
    used.add(best.hotspot.id);
  }

  const last = stops[stops.length - 1];
  return {
    stops,
    totalSeconds: Math.max(0, Math.round((last.leaveAt.getTime() - now.getTime()) / 1000)),
    totalDistanceKm: stops.reduce((sum, s) => sum + (s.distanceKm ?? 0), 0),
  };
}

/** Seconds of Raid Hour (golden hour) the stop gets: the rest of it, a full hour if it comes later that day, or 0. */
function goldenSecondsAt(stop: RouteStop): number {
  const { tier, secondsLeftInWindow, clock } = stop.atArrival;
  if (tier === 'golden') return secondsLeftInWindow;
  if (tier === 'peak' && clock.secondsOfDay < WINDOWS.golden.start) return WINDOWS.golden.end - WINDOWS.golden.start;
  return 0;
}

/**
 * The better stop for a Raid Hour chase:
 *  1. one that still gets a usable Raid Hour beats one that doesn't;
 *  2. the Raid Hour that is over sooner (10-minute buckets) — the chain can move on earlier;
 *  3. more Raid Hour minutes;
 *  4. golden on arrival before peak; then the shorter wait (10-minute buckets), the earlier arrival, the shorter
 *     leg and finally the id for stable renders.
 */
function isBetterStop(a: RouteStop, b: RouteStop): boolean {
  const goldA = goldenSecondsAt(a);
  const goldB = goldenSecondsAt(b);
  const hasA = goldA >= MIN_USABLE_SECONDS;
  const hasB = goldB >= MIN_USABLE_SECONDS;
  if (hasA !== hasB) return hasA;

  if (hasA) {
    const endDiff =
      Math.floor(a.leaveAt.getTime() / 1000 / WAIT_BUCKET_SECONDS) -
      Math.floor(b.leaveAt.getTime() / 1000 / WAIT_BUCKET_SECONDS);
    if (endDiff !== 0) return endDiff < 0;
    const goldDiff = Math.ceil(goldA / WAIT_BUCKET_SECONDS) - Math.ceil(goldB / WAIT_BUCKET_SECONDS);
    if (goldDiff !== 0) return goldDiff > 0;
  }

  const tierA = TIER_RANK[a.atArrival.tier];
  const tierB = TIER_RANK[b.atArrival.tier];
  if (tierA !== tierB) return tierA < tierB;

  const bucketDiff = Math.ceil(a.waitSeconds / WAIT_BUCKET_SECONDS) - Math.ceil(b.waitSeconds / WAIT_BUCKET_SECONDS);
  if (bucketDiff !== 0) return bucketDiff < 0;

  if (a.arriveAt.getTime() !== b.arriveAt.getTime()) return a.arriveAt < b.arriveAt;
  const kmA = a.distanceKm ?? 0;
  const kmB = b.distanceKm ?? 0;
  if (kmA !== kmB) return kmA < kmB;
  return a.hotspot.id.localeCompare(b.hotspot.id) < 0;
}
