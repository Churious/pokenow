/**
 * Local-time event maths for `data/schedule.ts`. Pure, no React.
 *
 * A local-time event happens once per time zone: "Saturday 14:00–17:00" starts
 * first at UTC+14 and ends last at UTC−12. For one visitor we report it in
 * their own zone, and also whether it is still running somewhere else.
 */

import type { ScheduledEvent } from '../data/schedule';

const MINUTE = 60_000;
/** Latest civil time-zone offset in use (minutes east of UTC): UTC−12. */
const LATEST_OFFSET = -12 * 60;

const offsetFormatters = new Map<string, Intl.DateTimeFormat>();

/** Offset of `timeZone` from UTC at `instant`, in minutes east of UTC. */
export function zoneOffsetMinutes(instant: number, timeZone: string): number {
  let f = offsetFormatters.get(timeZone);
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    offsetFormatters.set(timeZone, f);
  }
  const p = Object.fromEntries(f.formatToParts(instant).map((x) => [x.type, x.value]));
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((asUtc - Math.floor(instant / 1000) * 1000) / MINUTE);
}

/** Naive "wall clock as if UTC" milliseconds for a local date + "HH:MM". */
function wallMs(date: string, time: string): number {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = time.split(':').map(Number);
  return Date.UTC(y, m - 1, d, hh, mm);
}

/** The instant at which a local wall-clock time happens in `timeZone` (DST-aware). */
export function zonedInstant(date: string, time: string, timeZone: string): number {
  const wall = wallMs(date, time);
  let instant = wall - zoneOffsetMinutes(wall, timeZone) * MINUTE;
  // One correction step handles a DST change between the guess and the answer.
  instant = wall - zoneOffsetMinutes(instant, timeZone) * MINUTE;
  return instant;
}

/** Local wall-clock window of an event; a whole day when no time is announced. */
function localWindow(e: ScheduledEvent): { startDate: string; startTime: string; endDate: string; endTime: string } {
  const last = e.endDate ?? e.date;
  if (e.start && e.end) return { startDate: e.date, startTime: e.start, endDate: last, endTime: e.end };
  return { startDate: e.date, startTime: '00:00', endDate: nextDay(last), endTime: '00:00' };
}

export type EventState =
  /** Not started in the visitor's zone yet. */
  | { phase: 'upcoming'; secondsUntil: number }
  /** Running now in the visitor's zone. */
  | { phase: 'live'; secondsLeft: number }
  /** Over in the visitor's zone, still running in zones further west. */
  | { phase: 'elsewhere' };

export interface EventStatus {
  event: ScheduledEvent;
  state: EventState;
}

/**
 * Events that have not finished in every time zone yet, in date order, with
 * their state for a visitor in `timeZone`.
 */
export function upcomingEvents(events: readonly ScheduledEvent[], now: Date, timeZone: string): EventStatus[] {
  const t = now.getTime();
  const out: EventStatus[] = [];
  for (const event of events) {
    const w = localWindow(event);
    // The last place to finish is UTC−12.
    const endsEverywhere = wallMs(w.endDate, w.endTime) - LATEST_OFFSET * MINUTE;
    if (endsEverywhere <= t) continue;

    const startsAt = zonedInstant(w.startDate, w.startTime, timeZone);
    const endsAt = zonedInstant(w.endDate, w.endTime, timeZone);
    const state: EventState =
      t < startsAt
        ? { phase: 'upcoming', secondsUntil: Math.round((startsAt - t) / 1000) }
        : t < endsAt
          ? { phase: 'live', secondsLeft: Math.round((endsAt - t) / 1000) }
          : { phase: 'elsewhere' };
    out.push({ event, state });
  }
  return out.sort((a, b) => a.event.date.localeCompare(b.event.date) || a.event.id.localeCompare(b.event.id));
}

function nextDay(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + 1)).toISOString().slice(0, 10);
}
