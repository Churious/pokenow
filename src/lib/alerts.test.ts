import { describe, it, expect } from 'vitest';
import { evaluateAlerts } from './alerts';
import type { ScoredHotspot, TravelState } from '../types';

const makeSpot = (id: string, city: string, hour: number, minute: number, waitSeconds = 0): ScoredHotspot => ({
  hotspot: {
    id,
    city,
    spot: 'Center',
    countryCode: 'JP',
    region: 'Asia-Pacific',
    lat: 35.6,
    lng: 139.7,
    timeZone: 'Asia/Tokyo',
  },
  clock: { hour, minute, second: 0, secondsOfDay: hour * 3600 + minute * 60, weekday: 3, ymd: '2026-11-15' },
  tier: 'peak',
  status: 'active',
  secondsUntilNextWindow: 0,
  nextWindow: null,
  secondsLeftInWindow: 3600,
  eventLabel: null,
  plan: {
    distanceKm: 0,
    waitSeconds,
    arrivalTier: 'peak',
    arrivalEventLabel: null,
    secondsUntilUsable: waitSeconds,
  },
});

describe('pro alerts evaluator', () => {
  it('fires cooldown alert once when transition from cooling down to ready happens', () => {
    const travel: TravelState = {
      mode: 'cooldown',
      origin: { lat: 35.6, lng: 139.7, label: 'Tokyo' },
      lastActionAt: 1000,
    };
    const now = new Date('2026-11-15T10:00:00Z');
    const spot = makeSpot('tokyo', 'Tokyo', 12, 0, 0);
    const fired = new Set<string>();

    const res = evaluateAlerts([spot], travel, new Set(), now, fired, true);
    expect(res.isCoolingDown).toBe(false);
    expect(res.alerts).toEqual([{ id: 'cd:1000', kind: 'cooldown' }]);

    fired.add('cd:1000');
    const res2 = evaluateAlerts([spot], travel, new Set(), now, fired, false);
    expect(res2.alerts).toEqual([]);
  });

  it('fires golden-hour alert for pinned spots within 10 minutes of 18:00', () => {
    const now = new Date('2026-11-15T10:00:00Z');
    const tokyoSoon = makeSpot('tokyo', 'Tokyo', 17, 52, 0); // 8 min before 18:00
    const seoulFar = makeSpot('seoul', 'Seoul', 17, 30, 0);  // 30 min before 18:00
    const fired = new Set<string>();

    const res = evaluateAlerts([tokyoSoon, seoulFar], { mode: 'free' }, new Set(['tokyo', 'seoul']), now, fired, false);
    expect(res.alerts).toEqual([{ id: 'golden:tokyo:2026-11-15', kind: 'golden', city: 'Tokyo' }]);
  });
});
