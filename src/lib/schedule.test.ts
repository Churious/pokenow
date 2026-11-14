import { describe, expect, it } from 'vitest';
import fixture from './__fixtures__/scrapedduck-events.json';
import { eventStatuses, instantIn, parseFeed, type GoEvent } from './schedule';

const ev = (over: Partial<GoEvent> = {}): GoEvent => ({
  id: 'e',
  kind: 'community-day',
  name: 'Test Day',
  start: '2026-11-21T14:00:00.000',
  end: '2026-11-21T17:00:00.000',
  link: 'https://leekduck.com/events/e/',
  pokemon: [],
  ...over,
});

describe('feed parsing', () => {
  const events = parseFeed(fixture);

  it('keeps known kinds with valid dates and drops the rest', () => {
    expect(events.length).toBeGreaterThan(5);
    expect(events.every((e) => e.start && e.end)).toBe(true);
    expect(events.some((e) => e.kind === 'raid-hour')).toBe(true);
    // go-battle-league is not shown; entries without dates are dropped.
    expect(events.some((e) => e.name.includes('GO Battle League'))).toBe(false);
  });

  it('extracts raid boss and Community Day Pokémon names, never image URLs', () => {
    const bosses = events.find((e) => e.kind === 'raid-bosses' && e.name.includes('Cresselia'));
    expect(bosses?.pokemon).toEqual(['Cresselia', 'Darkrai']);
    const cd = events.find((e) => e.kind === 'community-day' && e.name.includes('Pawniard'));
    expect(cd?.pokemon).toEqual(['Pawniard']);
    expect(JSON.stringify(events)).not.toContain('cdn.leekduck.com');
  });

  it('reads the Spotlight Hour bonus', () => {
    expect(events.find((e) => e.kind === 'spotlight')?.bonus).toMatch(/Candy|XP|Stardust/);
  });

  it('survives garbage', () => {
    expect(parseFeed(null)).toEqual([]);
    expect(parseFeed([1, 'x', {}, { eventType: 'raid-hour', eventID: 'a', start: 'soon', end: 'later' }])).toEqual([]);
  });
});

describe('local-time events', () => {
  it('converts local wall time to an instant, DST included; UTC times pass through', () => {
    expect(new Date(instantIn('2026-11-21T14:00:00.000', 'Asia/Seoul')).toISOString()).toBe('2026-11-21T05:00:00.000Z');
    expect(new Date(instantIn('2026-11-21T14:00:00.000', 'America/New_York')).toISOString()).toBe(
      '2026-11-21T19:00:00.000Z',
    );
    expect(new Date(instantIn('2026-07-04T14:00:00.000', 'America/New_York')).toISOString()).toBe(
      '2026-07-04T18:00:00.000Z',
    );
    expect(new Date(instantIn('2026-07-04T14:00:00.000Z', 'Asia/Seoul')).toISOString()).toBe('2026-07-04T14:00:00.000Z');
  });

  it('is upcoming, live, or still running further west', () => {
    const at = (iso: string) => eventStatuses([ev()], new Date(iso), 'Asia/Seoul')[0].state;
    expect(at('2026-11-21T04:00:00Z')).toEqual({ phase: 'upcoming', secondsUntil: 3600 });
    expect(at('2026-11-21T06:00:00Z')).toEqual({ phase: 'live', secondsLeft: 2 * 3600 });
    expect(at('2026-11-21T11:00:00Z')).toEqual({ phase: 'elsewhere' });
  });

  it('drops a local-time event once it has ended at UTC−12, a global one at its instant', () => {
    expect(eventStatuses([ev()], new Date('2026-11-22T04:59:00Z'), 'UTC')).toHaveLength(1);
    expect(eventStatuses([ev()], new Date('2026-11-22T05:00:00Z'), 'UTC')).toHaveLength(0);
    const global = ev({ start: '2026-11-21T14:00:00.000Z', end: '2026-11-21T17:00:00.000Z' });
    expect(eventStatuses([global], new Date('2026-11-21T17:00:00Z'), 'UTC')).toHaveLength(0);
  });

  it('orders by start in the visitor zone', () => {
    const list = eventStatuses(
      [ev({ id: 'b', start: '2026-12-01T10:00:00.000', end: '2026-12-01T11:00:00.000' }), ev({ id: 'a' })],
      new Date('2026-11-01T00:00:00Z'),
      'UTC',
    );
    expect(list.map((s) => s.event.id)).toEqual(['a', 'b']);
  });
});
