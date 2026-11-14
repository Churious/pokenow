import { describe, expect, it } from 'vitest';
import { HOTSPOTS } from '../data/hotspots';
import { suggestedCooldownMinutes } from '../data/cooldowns';
import type { Hotspot } from '../types';
import { classify, compareScored, rankHotspots, scoreHotspot, secondsUntil } from './scoring';
import { getLocalClock, isValidTimeZone } from './time';
import { distanceKm, formatCoords } from './geo';

const spot = (over: Partial<Hotspot>): Hotspot => ({
  id: 'x',
  city: 'X',
  spot: 'X',
  countryCode: 'JP',
  region: 'Asia-Pacific',
  lat: 0,
  lng: 0,
  timeZone: 'UTC',
  popularity: 50,
  ...over,
});

describe('dataset (hotspots.ts)', () => {
  it('has at least 15 spots with unique ids', () => {
    expect(HOTSPOTS.length).toBeGreaterThanOrEqual(15);
    expect(new Set(HOTSPOTS.map((h) => h.id)).size).toBe(HOTSPOTS.length);
  });

  it.each(HOTSPOTS.map((h) => [h.id, h] as const))('%s is valid', (_id, h) => {
    expect(isValidTimeZone(h.timeZone)).toBe(true);
    expect(h.lat).toBeGreaterThanOrEqual(-90);
    expect(h.lat).toBeLessThanOrEqual(90);
    expect(h.lng).toBeGreaterThanOrEqual(-180);
    expect(h.lng).toBeLessThanOrEqual(180);
    expect(h.popularity).toBeGreaterThanOrEqual(1);
    expect(h.popularity).toBeLessThanOrEqual(100);
    expect(h.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(h.countryCode).toMatch(/^[A-Z]{2}$/);
  });
});

describe('time utils', () => {
  it('handles DST automatically (London: GMT in Jan, BST in Jul)', () => {
    expect(getLocalClock(new Date('2026-01-15T18:30:00Z'), 'Europe/London').hour).toBe(18);
    expect(getLocalClock(new Date('2026-07-15T18:30:00Z'), 'Europe/London').hour).toBe(19);
  });

  it('handles southern-hemisphere DST (Sydney: AEDT in Jan = UTC+11)', () => {
    expect(getLocalClock(new Date('2026-01-15T07:00:00Z'), 'Australia/Sydney').hour).toBe(18);
    expect(getLocalClock(new Date('2026-07-15T07:00:00Z'), 'Australia/Sydney').hour).toBe(17);
  });

  it('returns 0 (not 24) at local midnight', () => {
    expect(getLocalClock(new Date('2026-03-01T15:00:00Z'), 'Asia/Tokyo').hour).toBe(0);
  });

  it('reports the local weekday', () => {
    // 2026-11-18 is a Wednesday. 09:00Z = 18:00 in Tokyo (UTC+9).
    const c = getLocalClock(new Date('2026-11-18T09:00:00Z'), 'Asia/Tokyo');
    expect(c.weekday).toBe(3);
    expect(c.hour).toBe(18);
  });
});

describe('classification', () => {
  const at = (h: number, m = 0) => ({ hour: h, minute: m, second: 0, weekday: 1, secondsOfDay: h * 3600 + m * 60 });
  it('uses half-open windows', () => {
    expect(classify(at(10, 59))).toBe('upcoming');
    expect(classify(at(11))).toBe('peak');
    expect(classify(at(17, 59))).toBe('peak');
    expect(classify(at(18))).toBe('golden');
    expect(classify(at(18, 59))).toBe('golden');
    expect(classify(at(19))).toBe('peak');
    expect(classify(at(19, 59))).toBe('peak');
    expect(classify(at(20))).toBe('upcoming');
    expect(classify(at(0))).toBe('upcoming');
  });

  it('secondsUntil wraps around midnight', () => {
    expect(secondsUntil(11 * 3600, 23 * 3600)).toBe(12 * 3600);
    expect(secondsUntil(11 * 3600, 11 * 3600)).toBe(0);
  });
});

describe('ranking', () => {
  // Wednesday 2026-11-18 09:00Z → Tokyo 18:00 (golden, Raid Hour), Seoul 18:00 (golden).
  const wed = new Date('2026-11-18T09:00:00Z');

  it('labels Wednesday golden time as Raid Hour and Tuesday as Spotlight Hour', () => {
    expect(scoreHotspot(spot({ timeZone: 'Asia/Tokyo' }), wed).eventLabel).toBe('Raid Hour');
    const tue = new Date('2026-11-17T09:00:00Z');
    expect(scoreHotspot(spot({ timeZone: 'Asia/Tokyo' }), tue).eventLabel).toBe('Spotlight Hour');
  });

  it('golden beats peak even with lower popularity', () => {
    const golden = scoreHotspot(spot({ id: 'g', timeZone: 'Asia/Tokyo', popularity: 1 }), wed); // 18:00
    const peak = scoreHotspot(spot({ id: 'p', timeZone: 'Asia/Shanghai', popularity: 100 }), wed); // 17:00
    expect([peak, golden].sort(compareScored)[0].hotspot.id).toBe('g');
  });

  it('breaks ties inside a tier by popularity', () => {
    const a = scoreHotspot(spot({ id: 'a', timeZone: 'Asia/Tokyo', popularity: 60 }), wed);
    const b = scoreHotspot(spot({ id: 'b', timeZone: 'Asia/Seoul', popularity: 90 }), wed);
    expect([a, b].sort(compareScored)[0].hotspot.id).toBe('b');
  });

  it('when everything is quiet, recommends the spot that opens soonest', () => {
    const t = new Date('2026-11-18T13:30:00Z');
    // Honolulu 03:30 (opens in 7h30), Los Angeles 05:30 (opens in 5h30), Tokyo 22:30 (opens in 12h30)
    const ranked = rankHotspots(
      [
        spot({ id: 'hnl', timeZone: 'Pacific/Honolulu', popularity: 100 }),
        spot({ id: 'lax', timeZone: 'America/Los_Angeles', popularity: 1 }),
        spot({ id: 'tyo', timeZone: 'Asia/Tokyo', popularity: 100 }),
      ],
      t,
    );
    expect(ranked.every((s) => s.tier === 'upcoming')).toBe(true);
    expect(ranked[0].hotspot.id).toBe('lax');
    expect(ranked[0].secondsUntilNextWindow).toBe(5.5 * 3600);
    expect(ranked[0].nextWindow).toBe('peak');
  });

  it('always returns a recommendation for the real dataset at any hour', () => {
    for (let h = 0; h < 24 * 7; h++) {
      const ranked = rankHotspots(HOTSPOTS, new Date(Date.UTC(2026, 10, 16, h)));
      expect(ranked).toHaveLength(HOTSPOTS.length);
      expect(ranked[0]).toBeDefined();
    }
  });
});

describe('geo & cooldown', () => {
  it('formats coordinates with 4 decimals', () => {
    expect(formatCoords({ lat: 40.7536, lng: -73.9832 })).toBe('40.7536, -73.9832');
  });

  it('computes a plausible NYC → London distance (~5,570 km)', () => {
    const km = distanceKm({ lat: 40.7536, lng: -73.9832 }, { lat: 51.5073, lng: -0.1657 });
    expect(km).toBeGreaterThan(5500);
    expect(km).toBeLessThan(5650);
  });

  it('caps cooldown at 120 minutes', () => {
    expect(suggestedCooldownMinutes(0.5)).toBe(1);
    expect(suggestedCooldownMinutes(20000)).toBe(120);
  });
});

describe('cooldown / soft-ban aware planning', () => {
  // Wed 2026-11-18 09:00Z → Tokyo & Seoul 18:00 (golden). Taipei 17:00 (peak).
  const wed = new Date('2026-11-18T09:00:00Z');
  const tokyo = spot({ id: 'tyo', timeZone: 'Asia/Tokyo', lat: 35.6896, lng: 139.7006, popularity: 98 });
  const busan = spot({ id: 'pus', timeZone: 'Asia/Seoul', lat: 35.1578, lng: 129.0592, popularity: 80 });

  it('free mode keeps the original ranking (waits are all 0)', () => {
    const r = rankHotspots([busan, tokyo], wed);
    expect(r[0].hotspot.id).toBe('tyo');
    expect(r.every((s) => s.plan.waitSeconds === 0 && s.plan.distanceKm === null)).toBe(true);
  });

  it('prefers the reachable golden spot when the popular one needs a long wait', () => {
    // Last action in Busan just now: Busan is 0 km away, Tokyo ~970 km (≈100 min wait).
    const travel = {
      mode: 'cooldown' as const,
      origin: { lat: busan.lat, lng: busan.lng, label: 'Busan' },
      lastActionAt: wed.getTime(),
    };
    const r = rankHotspots([tokyo, busan], wed, travel);
    expect(r[0].hotspot.id).toBe('pus');
    expect(r[0].plan.waitSeconds).toBe(0);
    const t = r.find((s) => s.hotspot.id === 'tyo')!;
    expect(t.plan.distanceKm).toBeGreaterThan(900);
    expect(t.plan.waitSeconds).toBe(100 * 60);
    // Arriving in Tokyo at 19:40 → golden is over, peak has 20 min left → still peak.
    expect(t.plan.arrivalTier).toBe('peak');
  });

  it('subtracts time already elapsed since the last action', () => {
    const travel = {
      mode: 'softban' as const,
      origin: { lat: busan.lat, lng: busan.lng, label: 'Busan' },
      lastActionAt: wed.getTime() - 95 * 60 * 1000,
    };
    const t = scoreHotspot(tokyo, wed, travel);
    expect(t.plan.waitSeconds).toBe(5 * 60);
  });

  it('treats everything as free after 2 hours without actions', () => {
    const travel = {
      mode: 'cooldown' as const,
      origin: { lat: 0, lng: 0, label: 'Null Island' },
      lastActionAt: wed.getTime() - 121 * 60 * 1000,
    };
    expect(rankHotspots(HOTSPOTS, wed, travel).every((s) => s.plan.waitSeconds === 0)).toBe(true);
  });

  it('does not count a window that closes within 15 minutes of arrival', () => {
    // Taipei 19:50 on arrival (peak ends 20:00) → upcoming.
    const taipei = spot({ id: 'tpe', timeZone: 'Asia/Taipei', lat: 25.0478, lng: 121.517 });
    const start = new Date('2026-11-18T11:28:00Z'); // Taipei 19:28, arrival 19:50
    const s = scoreHotspot(taipei, start, {
      mode: 'cooldown',
      origin: { lat: 25.0478, lng: 122.0, label: 'nearby' }, // ~48 km → 22 min
      lastActionAt: start.getTime(),
    });
    expect(s.plan.waitSeconds).toBe(22 * 60);
    expect(s.plan.arrivalTier).toBe('upcoming');
  });
});
