import { describe, expect, it } from 'vitest';
import { SCHEDULE, type ScheduledEvent } from '../data/schedule';
import { upcomingEvents, zonedInstant } from './schedule';

const ev = (over: Partial<ScheduledEvent> = {}): ScheduledEvent => ({
  id: 'e',
  kind: 'community-day',
  name: 'Test Day',
  date: '2026-11-21',
  start: '14:00',
  end: '17:00',
  source: 'https://pokemongo.com/news/x',
  ...over,
});

describe('schedule data', () => {
  it('has unique ids, valid dates and official sources', () => {
    expect(new Set(SCHEDULE.map((e) => e.id)).size).toBe(SCHEDULE.length);
    for (const e of SCHEDULE) {
      expect(e.date, e.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      if (e.endDate) expect(e.endDate >= e.date, e.id).toBe(true);
      expect(Boolean(e.start) === Boolean(e.end), `${e.id}: start and end come together`).toBe(true);
      if (e.start) expect(e.start, e.id).toMatch(/^\d{2}:\d{2}$/);
      expect(e.source, e.id).toMatch(/^https:\/\/pokemongo\.com\//);
    }
  });
});

describe('local-time events', () => {
  it('converts local wall time to an instant, DST included', () => {
    expect(new Date(zonedInstant('2026-11-21', '14:00', 'Asia/Seoul')).toISOString()).toBe('2026-11-21T05:00:00.000Z');
    // New York: EST in November, EDT in July.
    expect(new Date(zonedInstant('2026-11-21', '14:00', 'America/New_York')).toISOString()).toBe('2026-11-21T19:00:00.000Z');
    expect(new Date(zonedInstant('2026-07-04', '14:00', 'America/New_York')).toISOString()).toBe('2026-07-04T18:00:00.000Z');
  });

  it('is upcoming, live, or still running further west', () => {
    const e = [ev()];
    const before = upcomingEvents(e, new Date('2026-11-21T04:00:00Z'), 'Asia/Seoul')[0].state;
    expect(before).toEqual({ phase: 'upcoming', secondsUntil: 3600 });
    const during = upcomingEvents(e, new Date('2026-11-21T06:00:00Z'), 'Asia/Seoul')[0].state;
    expect(during).toEqual({ phase: 'live', secondsLeft: 2 * 3600 });
    // 20:00 in Seoul: over there, but New York hasn't started yet.
    const after = upcomingEvents(e, new Date('2026-11-21T11:00:00Z'), 'Asia/Seoul')[0].state;
    expect(after).toEqual({ phase: 'elsewhere' });
  });

  it('drops an event once it has ended in every time zone (UTC−12)', () => {
    // 17:00 at UTC−12 on Nov 21 = 05:00 UTC on Nov 22.
    expect(upcomingEvents([ev()], new Date('2026-11-22T04:59:00Z'), 'UTC')).toHaveLength(1);
    expect(upcomingEvents([ev()], new Date('2026-11-22T05:00:00Z'), 'UTC')).toHaveLength(0);
  });

  it('treats an unannounced time as the whole local day', () => {
    const e = [ev({ start: undefined, end: undefined, date: '2026-12-05' })];
    expect(upcomingEvents(e, new Date('2026-12-04T15:00:00Z'), 'Asia/Seoul')[0].state).toEqual({
      phase: 'live',
      secondsLeft: 24 * 3600,
    });
  });

  it('orders by date', () => {
    const list = upcomingEvents(
      [ev({ id: 'b', date: '2026-12-01' }), ev({ id: 'a', date: '2026-11-30' })],
      new Date('2026-11-01T00:00:00Z'),
      'UTC',
    );
    expect(list.map((s) => s.event.id)).toEqual(['a', 'b']);
  });
});
