/**
 * Pokémon GO event feed: parsing and local-time maths. Pure, no React.
 *
 * Source: ScrapedDuck (https://github.com/bigfoott/ScrapedDuck), an open-source
 * JSON mirror of the community calendar at Leek Duck. It is unofficial; the UI
 * says so and links to Leek Duck.
 *
 * Times in the feed come in two forms:
 *  - "2026-11-21T14:00:00.000"  local wall-clock time — the event runs at that
 *    time in every time zone (Community Day, Raid Hour, …);
 *  - "2026-11-21T14:00:00.000Z" one global instant.
 * A local-time event starts first at UTC+14 and ends last at UTC−12. For one
 * visitor we report it in their own zone, and whether it still runs elsewhere.
 */

export const FEED_URL = 'https://raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.min.json';
export const FEED_SOURCE_URL = 'https://leekduck.com/events/';

/** Feed event types we show, mapped to our own kinds. Everything else is ignored. */
const KIND_BY_TYPE = {
  'raid-hour': 'raid-hour',
  'pokemon-spotlight-hour': 'spotlight',
  'community-day': 'community-day',
  'raid-day': 'raid-day',
  'raid-weekend': 'raid-day',
  'raid-battles': 'raid-bosses',
  'elite-raids': 'raid-bosses',
  event: 'event',
  'live-event': 'event',
  'wild-area': 'event',
  'pokemon-go-fest': 'event',
  'pokemon-go-tour': 'event',
  'safari-zone': 'event',
  'city-safari': 'event',
} as const;

export type GoEventKind = (typeof KIND_BY_TYPE)[keyof typeof KIND_BY_TYPE];

export interface GoEvent {
  id: string;
  kind: GoEventKind;
  name: string;
  /** Feed time strings, as given (local wall time, or UTC with a trailing Z). */
  start: string;
  end: string;
  /** Leek Duck page for the event. */
  link: string;
  /** Raid bosses (raid-bosses kind) or featured Pokémon (spotlight / community day). Names only. */
  pokemon: string[];
  /** Spotlight bonus text, e.g. "2× Catch Candy". */
  bonus?: string;
}

interface RawEvent {
  eventID?: unknown;
  name?: unknown;
  eventType?: unknown;
  link?: unknown;
  start?: unknown;
  end?: unknown;
  extraData?: {
    raidbattles?: { bosses?: { name?: unknown }[] };
    spotlight?: { name?: unknown; bonus?: unknown };
    communityday?: { spawns?: { name?: unknown }[] };
  } | null;
}

const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z?$/;
const str = (v: unknown): string => (typeof v === 'string' ? v : '');
const names = (list: { name?: unknown }[] | undefined): string[] =>
  (list ?? []).map((p) => str(p.name)).filter(Boolean);

/**
 * Turns the raw feed into our events. Defensive: unknown types, missing dates
 * and malformed entries are dropped instead of throwing, so a feed change can't
 * break the page. Only names are kept — never the artwork URLs in the feed.
 */
export function parseFeed(raw: unknown): GoEvent[] {
  if (!Array.isArray(raw)) return [];
  const out: GoEvent[] = [];
  const seen = new Set<string>();
  for (const item of raw as RawEvent[]) {
    if (!item || typeof item !== 'object') continue;
    const type = str(item.eventType) as keyof typeof KIND_BY_TYPE;
    const kind = KIND_BY_TYPE[type];
    const id = str(item.eventID);
    const start = str(item.start);
    const end = str(item.end);
    if (!kind || !id || seen.has(id) || !ISO.test(start) || !ISO.test(end)) continue;
    const link = str(item.link);
    const x = item.extraData ?? {};
    const pokemon =
      kind === 'raid-bosses'
        ? names(x.raidbattles?.bosses)
        : kind === 'community-day'
          ? names(x.communityday?.spawns)
          : [];
    seen.add(id);
    out.push({
      id,
      kind,
      name: str(item.name) || id,
      start,
      end,
      link: link.startsWith('https://') ? link : FEED_SOURCE_URL,
      pokemon,
      bonus: kind === 'spotlight' ? str(x.spotlight?.bonus) || undefined : undefined,
    });
  }
  return out;
}

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

const isUtc = (s: string) => s.endsWith('Z');

/** Feed wall-clock string read as if it were UTC (for local-time events). */
function wallMs(s: string): number {
  return Date.parse(isUtc(s) ? s : `${s.replace(/\.\d+$/, '')}Z`);
}

/** The instant a feed time happens in `timeZone` (DST-aware); global times are returned as-is. */
export function instantIn(s: string, timeZone: string): number {
  if (isUtc(s)) return Date.parse(s);
  const wall = wallMs(s);
  let instant = wall - zoneOffsetMinutes(wall, timeZone) * MINUTE;
  // One correction step handles a DST change between the guess and the answer.
  instant = wall - zoneOffsetMinutes(instant, timeZone) * MINUTE;
  return instant;
}

export type EventState =
  /** Not started in the visitor's zone yet. */
  | { phase: 'upcoming'; secondsUntil: number }
  /** Running now in the visitor's zone. */
  | { phase: 'live'; secondsLeft: number }
  /** Over in the visitor's zone, still running in zones further west. */
  | { phase: 'elsewhere' };

export interface EventStatus {
  event: GoEvent;
  state: EventState;
  /** Start / end in the visitor's zone (epoch ms). */
  startsAt: number;
  endsAt: number;
}

/** State of every event that hasn't finished everywhere yet, by start time. */
export function eventStatuses(events: readonly GoEvent[], now: Date, timeZone: string): EventStatus[] {
  const t = now.getTime();
  const out: EventStatus[] = [];
  for (const event of events) {
    const endsEverywhere = isUtc(event.end) ? Date.parse(event.end) : wallMs(event.end) - LATEST_OFFSET * MINUTE;
    if (endsEverywhere <= t) continue;
    const startsAt = instantIn(event.start, timeZone);
    const endsAt = instantIn(event.end, timeZone);
    const state: EventState =
      t < startsAt
        ? { phase: 'upcoming', secondsUntil: Math.round((startsAt - t) / 1000) }
        : t < endsAt
          ? { phase: 'live', secondsLeft: Math.round((endsAt - t) / 1000) }
          : { phase: 'elsewhere' };
    out.push({ event, state, startsAt, endsAt });
  }
  return out.sort((a, b) => a.startsAt - b.startsAt || a.event.id.localeCompare(b.event.id));
}

/** Local wall-clock "HH:MM" of a feed time (as announced for local-time events). */
export function wallClock(s: string): string {
  return s.slice(11, 16);
}

/** "YYYY-MM-DD" part of a feed time. */
export function wallDate(s: string): string {
  return s.slice(0, 10);
}

export const isLocalTime = (e: GoEvent) => !isUtc(e.start);
