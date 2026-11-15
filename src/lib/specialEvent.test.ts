import { describe, expect, it } from 'vitest';
import { pickTodaySpecialEvent } from './specialEvent';
import type { EventStatus } from './schedule';

const mkStatus = (overrides: Partial<EventStatus> & { kind: EventStatus['event']['kind']; phase: EventStatus['state']['phase'] }): EventStatus => ({
  event: {
    id: `ev-${overrides.kind}`,
    kind: overrides.kind,
    name: `${overrides.kind} name`,
    start: '2026-11-15T14:00:00.000',
    end: '2026-11-15T17:00:00.000',
    link: 'https://leekduck.com/events/',
    pokemon: [],
  },
  startsAt: 0,
  endsAt: 0,
  state:
    overrides.phase === 'live'
      ? { phase: 'live', secondsLeft: 3600 }
      : overrides.phase === 'upcoming'
        ? { phase: 'upcoming', secondsUntil: 7200 }
        : { phase: 'elsewhere' },
  ...overrides,
});

describe('pickTodaySpecialEvent', () => {
  it('ignores regular raid-hour / spotlight and picks live special events first', () => {
    const picked = pickTodaySpecialEvent([
      mkStatus({ kind: 'raid-hour', phase: 'live' }),
      mkStatus({ kind: 'community-day', phase: 'upcoming' }),
      mkStatus({ kind: 'raid-day', phase: 'live' }),
    ]);
    expect(picked?.kind).toBe('raid-day');
    expect(picked?.phase).toBe('live');
  });

  it('returns null when no special event is live or within 24h', () => {
    const far = mkStatus({ kind: 'community-day', phase: 'upcoming' });
    far.state = { phase: 'upcoming', secondsUntil: 100_000 };
    expect(pickTodaySpecialEvent([far, mkStatus({ kind: 'raid-hour', phase: 'live' })])).toBeNull();
  });
});
