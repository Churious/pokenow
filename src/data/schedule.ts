/**
 * Upcoming Pokémon GO events, copied from official announcements only.
 *
 * Rules for this file:
 *  - Every entry needs `source`: a pokemongo.com page that states the date (and
 *    time, if given). No community calendars, leaks or guesses.
 *  - Dates and times are LOCAL time: each event runs at that wall-clock time in
 *    every time zone (2:00–5:00 p.m. in Seoul, then in Paris, then in New York).
 *  - Leave `start`/`end` out until the operator announces them; the UI then shows
 *    "time not announced yet" instead of assuming the usual slot.
 *  - Use the official English event name. Old entries can stay — the UI hides
 *    events that have ended in every time zone.
 *
 * Weekly Raid Hour (Wed) and Spotlight Hour (Thu) are not listed here; they are
 * part of the ranking (see lib/scoring.ts).
 */

export type ScheduledEventKind =
  | 'community-day'
  | 'raid-day'
  | 'super-mega-raid-day'
  | 'max-battle-day'
  | 'hatch-day';

export interface ScheduledEvent {
  /** Stable kebab-case id. */
  id: string;
  kind: ScheduledEventKind;
  /** Official English name. */
  name: string;
  /** First day, local time, "YYYY-MM-DD". */
  date: string;
  /** Last day for multi-day events, "YYYY-MM-DD". Defaults to `date`. */
  endDate?: string;
  /** Daily local start/end, "HH:MM" (24 h). Omit when not announced. */
  start?: string;
  end?: string;
  /** Official announcement (pokemongo.com). */
  source: string;
}

const SAVE_THE_DATE = 'https://pokemongo.com/news/save-the-date-s25';

export const SCHEDULE: readonly ScheduledEvent[] = [
  {
    id: 'community-day-2026-11-pawniard',
    kind: 'community-day',
    name: 'November 2026 Community Day: Pawniard',
    date: '2026-11-21',
    start: '14:00',
    end: '17:00',
    source: 'https://pokemongo.com/news/communityday-november-2026-pawniard',
  },
  {
    id: 'clefable-super-mega-raid-day-2026',
    kind: 'super-mega-raid-day',
    name: 'Clefable Super Mega Raid Day',
    date: '2026-11-28',
    start: '14:00',
    end: '17:00',
    source: 'https://pokemongo.com/news/clefable-super-mega-raid-day-2026',
  },
  // Dates from the "Save the dates" post; times not announced there.
  { id: 'max-battle-day-2026-12-05', kind: 'max-battle-day', name: 'Max Battle Day', date: '2026-12-05', source: SAVE_THE_DATE },
  {
    id: 'community-day-2026-12',
    kind: 'community-day',
    name: 'December Community Day',
    date: '2026-12-12',
    endDate: '2026-12-13',
    source: SAVE_THE_DATE,
  },
  { id: 'raid-day-2026-12-19', kind: 'raid-day', name: 'Raid Day', date: '2026-12-19', source: SAVE_THE_DATE },
  { id: 'hatch-day-2026-12-26', kind: 'hatch-day', name: 'Hatch Day', date: '2026-12-26', source: SAVE_THE_DATE },
  {
    id: 'community-day-classic-2027-01-02',
    kind: 'community-day',
    name: 'Community Day Classic',
    date: '2027-01-02',
    source: SAVE_THE_DATE,
  },
  {
    id: 'super-mega-raid-day-2027-01-09',
    kind: 'super-mega-raid-day',
    name: 'Super Mega Raid Day',
    date: '2027-01-09',
    source: SAVE_THE_DATE,
  },
  { id: 'community-day-2027-01-16', kind: 'community-day', name: 'Community Day', date: '2027-01-16', source: SAVE_THE_DATE },
  { id: 'max-battle-day-2027-01-23', kind: 'max-battle-day', name: 'Max Battle Day', date: '2027-01-23', source: SAVE_THE_DATE },
  {
    id: 'super-mega-raid-day-2027-01-30',
    kind: 'super-mega-raid-day',
    name: 'Super Mega Raid Day',
    date: '2027-01-30',
    source: SAVE_THE_DATE,
  },
  { id: 'community-day-2027-02-06', kind: 'community-day', name: 'Community Day', date: '2027-02-06', source: SAVE_THE_DATE },
  { id: 'raid-day-2027-02-13', kind: 'raid-day', name: 'Raid Day', date: '2027-02-13', source: SAVE_THE_DATE },
];
