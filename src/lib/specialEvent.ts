import type { EventStatus } from './schedule';

export interface TodaySpecialEvent {
  id: string;
  kind: 'community-day' | 'raid-day' | 'event';
  name: string;
  phase: 'live' | 'elsewhere' | 'today';
  secondsLeft?: number;
  secondsUntil?: number;
  link: string;
}

const SPECIAL_KINDS = new Set(['community-day', 'raid-day', 'event']);

const PHASE_PRIORITY: Record<TodaySpecialEvent['phase'], number> = {
  live: 0,
  elsewhere: 1,
  today: 2,
};

/**
 * Picks the highest-priority special event (Community Day, Raid Day, or major event)
 * currently live, live elsewhere in the world, or starting within 24 hours.
 */
export function pickTodaySpecialEvent(statuses: EventStatus[]): TodaySpecialEvent | null {
  const candidates: TodaySpecialEvent[] = [];

  for (const s of statuses) {
    if (!SPECIAL_KINDS.has(s.event.kind)) continue;
    const kind = s.event.kind as TodaySpecialEvent['kind'];
    if (s.state.phase === 'live') {
      candidates.push({
        id: s.event.id,
        kind,
        name: s.event.name,
        phase: 'live',
        secondsLeft: s.state.secondsLeft,
        link: s.event.link,
      });
    } else if (s.state.phase === 'elsewhere') {
      candidates.push({
        id: s.event.id,
        kind,
        name: s.event.name,
        phase: 'elsewhere',
        link: s.event.link,
      });
    } else if (s.state.phase === 'upcoming' && s.state.secondsUntil < 86_400) {
      candidates.push({
        id: s.event.id,
        kind,
        name: s.event.name,
        phase: 'today',
        secondsUntil: s.state.secondsUntil,
        link: s.event.link,
      });
    }
  }

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => PHASE_PRIORITY[a.phase] - PHASE_PRIORITY[b.phase]);
  return candidates[0];
}
