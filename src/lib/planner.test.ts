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

const dhaka = spot({ id: 'dhaka', city: 'Dhaka', timeZone: 'Asia/Dhaka', lat: 23.8103, lng: 90.4125 });
const bangkok = spot({ id: 'bangkok', city: 'Bangkok', timeZone: 'Asia/Bangkok', lat: 13.7563, lng: 100.5018 });
const istanbul = spot({ id: 'istanbul', city: 'Istanbul', timeZone: 'Europe/Istanbul', lat: 41.0082, lng: 28.9784 });

describe('cooldown route planner (Raid Hour chase)', () => {
  it('plays each Raid Hour to the end, then chases the next one west', () => {
    // Wed 18:00 Tokyo. Tokyo until 19:00 (10:00Z) → 2 h cooldown → Dhaka (UTC+6) at 18:00 (12:00Z)
    // → until 19:00 → 2 h → Istanbul (UTC+3) at 18:00 (15:00Z).
    const ranked = rankHotspots([tokyo, dhaka, bangkok, istanbul], evening);
    const route = planRoute(ranked, evening);

    expect(route.stops.map((s) => s.hotspot.id)).toEqual(['tokyo', 'dhaka', 'istanbul']);
    expect(route.stops[0].leaveAt.toISOString()).toBe('2026-11-18T10:00:00.000Z');
    expect(route.stops[1].waitSeconds).toBe(120 * 60);
    expect(route.stops[1].arriveAt.toISOString()).toBe('2026-11-18T12:00:00.000Z');
    expect(route.stops[1].atArrival.tier).toBe('golden');
    expect(route.stops[1].leaveAt.toISOString()).toBe('2026-11-18T13:00:00.000Z');
    expect(route.stops[2].atArrival.clock.hour).toBe(18);
    expect(route.stops[2].atArrival.clock.minute).toBe(0);
    expect(route.totalSeconds).toBe(7 * 60 * 60);
  });

  it('prefers a Raid Hour arrival over a peak one with the same wait', () => {
    // After Tokyo, Bangkok (UTC+7) would be 19:00 — peak only — while Dhaka is at 18:00.
    const route = planRoute(rankHotspots([tokyo, bangkok, dhaka], evening), evening);
    expect(route.stops[1].hotspot.id).toBe('dhaka');
  });

  it('stays at a morning peak spot through its Raid Hour', () => {
    // 11:00 in Tokyo: play until the golden hour ends at 19:00 (10:00Z).
    const route = planRoute(rankHotspots([tokyo], morning), morning);
    expect(route.stops).toHaveLength(1);
    expect(route.stops[0].atArrival.tier).toBe('peak');
    expect(route.stops[0].leaveAt.toISOString()).toBe('2026-11-18T10:00:00.000Z');
  });

  it('stays until the peak ends when it arrives after the Raid Hour', () => {
    const start = new Date('2026-11-18T10:10:00Z'); // 19:10 in Tokyo
    const route = planRoute(rankHotspots([tokyo, nearTokyo], start), start);
    expect(route.stops[0].hotspot.id).toBe('tokyo');
    expect(route.stops[0].leaveAt.toISOString()).toBe('2026-11-18T11:00:00.000Z'); // 20:00
    // The next hop would arrive after the peak closed.
    expect(route.stops).toHaveLength(1);
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
    expect(route.stops[0].leaveAt.toISOString()).toBe('2026-11-18T10:00:00.000Z');
  });

  it('starts with the Raid Hour about to begin, not a peak spot whose Raid Hour is hours away', () => {
    // 17:55 in Tokyo, 14:55 in Dhaka: Tokyo's Raid Hour is over first, so the chase starts there.
    const start = new Date('2026-11-18T08:55:00Z');
    const route = planRoute(rankHotspots([dhaka, tokyo, istanbul], start), start);
    expect(route.stops.map((s) => s.hotspot.id)).toEqual(['tokyo', 'dhaka', 'istanbul']);
    expect(route.stops[0].leaveAt.toISOString()).toBe('2026-11-18T10:00:00.000Z');
  });

  it('caps the number of stops and the planning horizon', () => {
    const ranked = rankHotspots([tokyo, dhaka, istanbul], evening);
    expect(planRoute(ranked, evening, { maxStops: 2 }).stops).toHaveLength(2);
    expect(planRoute(ranked, evening, { maxStops: 0 }).stops).toHaveLength(0);
    // Istanbul arrives 6 h after the start — outside a 5-hour horizon.
    const short = planRoute(ranked, evening, { horizonSeconds: 5 * 60 * 60 });
    expect(short.stops.map((s) => s.hotspot.id)).toEqual(['tokyo', 'dhaka']);
    expect(planRoute(ranked, evening).stops.length).toBeLessThanOrEqual(MAX_ROUTE_STOPS);
    expect(ROUTE_HORIZON_SECONDS).toBe(12 * 60 * 60);
  });

  it('never repeats a spot', () => {
    const route = planRoute(rankHotspots([tokyo, seoul, busan, dhaka, bangkok, istanbul], evening), evening);
    expect(new Set(route.stops.map((s) => s.hotspot.id)).size).toBe(route.stops.length);
  });

  it('returns an empty route when every spot is outside its window', () => {
    const quiet = new Date('2026-11-18T13:30:00Z'); // Tokyo 22:30, Busan 22:30, Seoul 22:30
    expect(planRoute(rankHotspots([tokyo, seoul, busan], quiet), quiet).stops).toHaveLength(0);
  });
});
