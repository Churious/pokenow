/**
 * Cooldown route planner.
 *
 * `scoring.ts` answers "where should I play right now?". This module answers the
 * follow-up question: "in what order should I play the next few spots?".
 *
 * Each leg is delayed by the cooldown for the distance flown, measured from the
 * *previous* stop: the player acts there, then has to wait before acting at the
 * next one. The result is the A → wait → B → wait → C plan that distance + cooldown
 * tables alone don't give you.
 *
 * Assumptions (kept explicit because they drive the output):
 *  - The first stop is the current recommendation (`ranked[0]`), as long as it
 *    will be inside a raid window on arrival. Its wait is the remaining cooldown
 *    already computed by `scoring.ts`.
 *  - A stop lasts `STOP_DWELL_SECONDS` (or until its window closes, if sooner).
 *    The last action is assumed to happen at the end of that stay, which makes
 *    every following wait slightly conservative.
 *  - Later stops are only added if they arrive inside a golden/peak window with
 *    at least `MIN_USABLE_SECONDS` left, within `ROUTE_HORIZON_SECONDS`.
 *  - A spot is never repeated.
 *
 * Pure functions only — no React, no globals — so the route is unit-testable and
 * could be reused by an API or bot later.
 */

import type { Hotspot, ScoredHotspot, Tier } from '../types';
import { suggestedCooldownMinutes } from '../data/cooldowns';
import { distanceKm } from './geo';
import { MIN_USABLE_SECONDS, scoreHotspot } from './scoring';

/** Assumed time spent at each stop (a raid plus catches/spins around it). */
export const STOP_DWELL_SECONDS = 30 * 60;

/** Never plan more than a short session ahead. */
export const ROUTE_HORIZON_SECONDS = 6 * 60 * 60;

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
  dwellSeconds?: number;
  horizonSeconds?: number;
}

const emptyRoute = (): Route => ({ stops: [], totalSeconds: 0, totalDistanceKm: 0 });

function leaveTime(arriveAt: Date, secondsLeftInWindow: number, dwellSeconds: number): Date {
  const playSeconds = Math.min(dwellSeconds, Math.max(0, secondsLeftInWindow));
  return new Date(arriveAt.getTime() + playSeconds * 1000);
}

/**
 * Build a cooldown-aware itinerary from the ranked list.
 * `ranked` must come from `rankHotspots(hotspots, now, travel)` so the first
 * stop's `plan` fields match the player's current cooldown.
 */
export function planRoute(ranked: readonly ScoredHotspot[], now: Date, options: PlanOptions = {}): Route {
  const maxStops = options.maxStops ?? MAX_ROUTE_STOPS;
  const dwellSeconds = options.dwellSeconds ?? STOP_DWELL_SECONDS;
  const horizonSeconds = options.horizonSeconds ?? ROUTE_HORIZON_SECONDS;
  if (maxStops <= 0) return emptyRoute();

  // The recommendation is the first stop unless it is still outside every window.
  const first = ranked.find((s) => s.plan.arrivalTier !== 'upcoming');
  if (!first) return emptyRoute();

  const firstArriveAt = new Date(now.getTime() + first.plan.waitSeconds * 1000);
  const firstLive = scoreHotspot(first.hotspot, firstArriveAt);
  const stops: RouteStop[] = [
    {
      hotspot: first.hotspot,
      atArrival: firstLive,
      arriveAt: firstArriveAt,
      leaveAt: leaveTime(firstArriveAt, firstLive.secondsLeftInWindow, dwellSeconds),
      distanceKm: first.plan.distanceKm,
      waitSeconds: first.plan.waitSeconds,
    },
  ];
  const used = new Set([first.hotspot.id]);

  while (stops.length < maxStops) {
    const previous = stops[stops.length - 1];
    // The last cooldown-triggering action is assumed to happen when leaving the previous stop.
    const cursor = previous.leaveAt;
    let best: RouteStop | null = null;
    let bestWaitSeconds = 0;

    for (const candidate of ranked) {
      if (used.has(candidate.hotspot.id)) continue;

      const km = distanceKm(previous.hotspot, candidate.hotspot);
      const waitSeconds = suggestedCooldownMinutes(km) * 60;
      const arriveAt = new Date(cursor.getTime() + waitSeconds * 1000);
      if ((arriveAt.getTime() - now.getTime()) / 1000 > horizonSeconds) continue;

      const atArrival = scoreHotspot(candidate.hotspot, arriveAt);
      // Arriving outside a window, or just before it closes, is not worth a stop.
      if (atArrival.tier === 'upcoming' || atArrival.secondsLeftInWindow < MIN_USABLE_SECONDS) continue;

      const stop: RouteStop = {
        hotspot: candidate.hotspot,
        atArrival,
        arriveAt,
        leaveAt: leaveTime(arriveAt, atArrival.secondsLeftInWindow, dwellSeconds),
        distanceKm: km,
        waitSeconds,
      };
      if (!best || isBetterStop(stop, best, waitSeconds, bestWaitSeconds)) {
        best = stop;
        bestWaitSeconds = waitSeconds;
      }
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

/**
 * The next stop: shorter wait wins (in 10-minute buckets), then golden before
 * peak, then the earlier arrival, then the longer remaining window, then the
 * shorter leg and finally the id for stable renders.
 */
function isBetterStop(a: RouteStop, b: RouteStop, waitA: number, waitB: number): boolean {
  const bucketDiff = Math.ceil(waitA / WAIT_BUCKET_SECONDS) - Math.ceil(waitB / WAIT_BUCKET_SECONDS);
  if (bucketDiff !== 0) return bucketDiff < 0;

  const tierA = TIER_RANK[a.atArrival.tier];
  const tierB = TIER_RANK[b.atArrival.tier];
  if (tierA !== tierB) return tierA < tierB;

  if (a.arriveAt.getTime() !== b.arriveAt.getTime()) return a.arriveAt < b.arriveAt;
  if (a.atArrival.secondsLeftInWindow !== b.atArrival.secondsLeftInWindow) {
    return a.atArrival.secondsLeftInWindow > b.atArrival.secondsLeftInWindow;
  }
  const kmA = a.distanceKm ?? 0;
  const kmB = b.distanceKm ?? 0;
  if (kmA !== kmB) return kmA < kmB;
  return a.hotspot.id.localeCompare(b.hotspot.id) < 0;
}
