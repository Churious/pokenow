import { describe, expect, it } from 'vitest';
import type { Hotspot, TravelState } from '../types';
import { rankHotspots } from './scoring';
import { MAX_ROUTE_STOPS, planRoute, ROUTE_HORIZON_SECONDS } from './planner';

const spot = (over: Partial<Hotspot>): Hotspot => ({
  id: 'x',
  city: 'X',
  spot: 'X',
  countryCode: 'JP',
  region: 'Asia-Pacific',
  lat: 0,
  lng: 0,
  timeZone: 'UTC',
  ...over,
});

// Wed 2026-11-18 09:00Z → 18:00 in Tokyo/Seoul (golden hour, Raid Hour).
const evening = new Date('2026-11-18T09:00:00Z');
// Wed 2026-11-18 02:00Z → 11:00 in Tokyo/Seoul (peak window).
const morning = new Date('2026-11-18T02:00:00Z');

const tokyo = spot({ id: 'tokyo', city: 'Tokyo', timeZone: 'Asia/Tokyo', lat: 35.6896, lng: 139.7006 });
const nearTokyo = spot({
  id: 'z-near-tokyo',
  city: 'Near Tokyo',
  timeZone: 'Asia/Tokyo',
  lat: 35.82,
  lng: 139.7006,
});
const busan = spot({ id: 'busan', city: 'Busan', timeZone: 'Asia/Seoul', lat: 35.1578, lng: 129.0592 });
const seoul = spot({ id: 'seoul', city: 'Seoul', timeZone: 'Asia/Seoul', lat: 37.5665, lng: 126.978 });

describe('cooldown route planner', () => {
  it('starts with the recommendation and chains the wait from the previous stop', () => {
    const ranked = rankHotspots([tokyo, nearTokyo], evening);
    const route = planRoute(ranked, evening);

    expect(route.stops[0].hotspot.id).toBe(ranked[0].hotspot.id);
    expect(route.stops).toHaveLength(2);
    expect(route.stops[1].hotspot.id).toBe('z-near-tokyo');
    // 14.5 km → 11 min community cooldown, measured after the 30 min stop in Tokyo.
    expect(route.stops[1].waitSeconds).toBe(11 * 60);
    expect(route.stops[1].atArrival.clock.hour).toBe(18);
    expect(route.stops[1].atArrival.clock.minute).toBe(41);
    // Golden hour ends at 19:00, so the stay is cut short instead of overrunning it.
    expect(route.stops[1].leaveAt.toISOString()).toBe('2026-11-18T10:00:00.000Z');
    expect(route.totalSeconds).toBe(60 * 60);
    expect(route.totalDistanceKm).toBeGreaterThan(13);
    expect(route.totalDistanceKm).toBeLessThan(16);
  });

  it('plans A → B → C across a peak window, waits included', () => {
    const ranked = rankHotspots([tokyo, seoul, busan], morning);
    const route = planRoute(ranked, morning);

    expect(route.stops.map((s) => s.hotspot.id)).toEqual(['busan', 'seoul', 'tokyo']);
    expect(route.stops[0].waitSeconds).toBe(0);
    expect(route.stops[1].waitSeconds).toBe(64 * 60); // Busan → Seoul ~325 km
    expect(route.stops[2].waitSeconds).toBe(118 * 60); // Seoul → Tokyo ~1,150 km
    expect(route.stops[1].atArrival.clock.hour).toBe(12);
    expect(route.stops[1].atArrival.clock.minute).toBe(34);
    expect(route.stops[2].atArrival.clock.hour).toBe(15);
    expect(route.stops[2].atArrival.clock.minute).toBe(2);
    expect(route.stops.every((s) => s.atArrival.tier === 'peak')).toBe(true);
    expect(new Set(route.stops.map((s) => s.hotspot.id)).size).toBe(route.stops.length);
  });

  it('honours the remaining cooldown before the first stop', () => {
    const travel: TravelState = {
      mode: 'cooldown',
      origin: { lat: busan.lat, lng: busan.lng, label: 'Busan' },
      lastActionAt: evening.getTime() - 95 * 60 * 1000,
    };
    const route = planRoute(rankHotspots([tokyo], evening, travel), evening);

    expect(route.stops).toHaveLength(1);
    expect(route.stops[0].waitSeconds).toBe(5 * 60);
    expect(route.stops[0].atArrival.clock.hour).toBe(18);
    expect(route.stops[0].atArrival.clock.minute).toBe(5);
  });

  it('skips a spot whose window closes within 15 minutes of arrival', () => {
    // ~66 km away → 25 min wait. Leaving at 18:30 arrives at 18:55, too late to be useful.
    const far = spot({
      id: 'z-far',
      city: 'Far',
      timeZone: 'Asia/Tokyo',
      lat: 36.28,
      lng: 139.7006,
    });
    const route = planRoute(rankHotspots([tokyo, far], evening), evening);
    expect(route.stops.map((s) => s.hotspot.id)).toEqual(['tokyo']);
  });

  it('caps the number of stops and the planning horizon', () => {
    const ranked = rankHotspots([tokyo, seoul, busan], morning);
    expect(planRoute(ranked, morning, { maxStops: 2 }).stops).toHaveLength(2);
    expect(planRoute(ranked, morning, { maxStops: 0 }).stops).toHaveLength(0);
    // Tokyo arrives at 15:02, which is 4h02 from the start — outside a 3-hour horizon.
    const short = planRoute(ranked, morning, { horizonSeconds: 3 * 60 * 60 });
    expect(short.stops.map((s) => s.hotspot.id)).toEqual(['busan', 'seoul']);
    expect(short.stops.length).toBeLessThanOrEqual(MAX_ROUTE_STOPS);
    expect(planRoute(ranked, morning).totalSeconds).toBeLessThanOrEqual(ROUTE_HORIZON_SECONDS);
  });

  it('returns an empty route when every spot is outside its window', () => {
    const quiet = new Date('2026-11-18T13:30:00Z'); // Tokyo 22:30, Busan 22:30, Seoul 22:30
    expect(planRoute(rankHotspots([tokyo, seoul, busan], quiet), quiet).stops).toHaveLength(0);
  });

  it('adds a nearby stop while the peak window is still open', () => {
    // 19:00 in Tokyo: 60 minutes of peak left, so a 14.5 km hop (11 min) still fits.
    const start = new Date('2026-11-18T10:00:00Z');
    const route = planRoute(rankHotspots([tokyo, nearTokyo], start), start);
    expect(route.stops[0].atArrival.tier).toBe('peak');
    expect(route.stops[1].atArrival.tier).toBe('peak');
    expect(route.stops[1].atArrival.clock.minute).toBe(41);
  });

  it('stops chaining when the next window would be too short', () => {
    // 19:10 in Tokyo: the same hop arrives at 19:51, with only 9 minutes of peak left.
    const start = new Date('2026-11-18T10:10:00Z');
    const route = planRoute(rankHotspots([tokyo, nearTokyo], start), start);
    expect(route.stops[0].hotspot.id).toBe('tokyo');
    expect(route.stops).toHaveLength(1);
  });
});
