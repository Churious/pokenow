/**
 * Shared domain types for PokeNow.
 * Keep these framework-agnostic so they can be reused by tests, scripts or a future API.
 */

/** Broad region used for grouping / filtering in the UI. */
export type Region = 'Asia-Pacific' | 'Europe & Middle East' | 'Americas';

/** A community-curated Pokémon GO hotspot. One entry = one copyable coordinate. */
export interface Hotspot {
  /** Stable, URL-safe unique id (kebab-case). Never change once published. */
  id: string;
  /** City name shown as the card title, e.g. "Tokyo". */
  city: string;
  /** The specific spot inside the city, e.g. "Shinjuku Station". */
  spot: string;
  /** ISO 3166-1 alpha-2 country code, e.g. "JP". */
  countryCode: string;
  region: Region;
  /** WGS84 latitude in decimal degrees (-90..90). Use 4–6 decimals. */
  lat: number;
  /** WGS84 longitude in decimal degrees (-180..180). Use 4–6 decimals. */
  lng: number;
  /**
   * IANA time zone identifier, e.g. "Asia/Tokyo".
   * DST is resolved automatically by Intl.DateTimeFormat — never hard-code UTC offsets.
   */
  timeZone: string;
  /** Optional one-line factual note shown on the spot page (what is there, not how good it is). */
  note?: string;
}

/** Recommendation tiers, highest priority first. */
export type Tier = 'golden' | 'peak' | 'upcoming';

/** Status badge displayed on every card. */
export type SpotStatus = 'raid-hour' | 'active' | 'quiet';

/** A wall-clock snapshot of a time zone at a given instant. */
export interface LocalClock {
  hour: number; // 0–23
  minute: number; // 0–59
  second: number; // 0–59
  /** 0 = Sunday … 6 = Saturday (local to the hotspot). */
  weekday: number;
  /** Seconds elapsed since local midnight (0–86399). */
  secondsOfDay: number;
  /** Local calendar date, "YYYY-MM-DD". */
  ymd: string;
}

/**
 * Local dates ("YYYY-MM-DD") that have a Raid Hour / Spotlight Hour in the
 * 18:00–19:00 window, taken from the event feed. When absent, the weekly
 * rule (Raid Hour Wednesday, Spotlight Hour Thursday) is used instead.
 */
export interface EventCalendar {
  raidHour: ReadonlySet<string>;
  spotlight: ReadonlySet<string>;
}

/** A hotspot enriched with live, computed data. */
export interface ScoredHotspot {
  hotspot: Hotspot;
  clock: LocalClock;
  tier: Tier;
  status: SpotStatus;
  /** Seconds until the next window start (11:00 or 18:00 local); 0 if a window is open now. */
  secondsUntilNextWindow: number;
  /** Which window comes next, for countdown labels. */
  nextWindow: 'peak' | 'golden' | null;
  /** Seconds left in the currently open window (golden or peak); 0 if none. */
  secondsLeftInWindow: number;
  /** Human label for special weekly events active right now, if any. */
  eventLabel: string | null;
  /** Travel plan from the player's last action location (see TravelState). */
  plan: TravelPlan;
}

/**
 * The player's cooldown situation.
 *  - free:     no cooldown-triggering action in the last 2 hours → can go anywhere.
 *  - cooldown: acted recently at `origin`; must wait before acting far away.
 *  - softban:  same math as cooldown (wait out the timer measured from the last
 *              successful action), but the UI shows recovery guidance.
 */
export type TravelState =
  | { mode: 'free' }
  | {
      mode: 'cooldown' | 'softban';
      /** Where the last cooldown-triggering action happened. */
      origin: { lat: number; lng: number; label: string };
      /** Epoch ms of that action. */
      lastActionAt: number;
    };

export interface TravelPlan {
  /** Great-circle distance from the last action location; null in free mode. */
  distanceKm: number | null;
  /** Seconds the player still has to wait before acting at this spot (0 = go now). */
  waitSeconds: number;
  /** Tier the spot will be in when the player can safely act there. */
  arrivalTier: Tier;
  /** Weekly event label at arrival (Raid Hour / Spotlight Hour / Golden Time). */
  arrivalEventLabel: string | null;
  /** Seconds from now until a usable raid window is open at this spot, wait included. */
  secondsUntilUsable: number;
}
