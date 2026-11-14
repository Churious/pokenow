/**
 * Lightweight, dependency-free time-zone helpers built on Intl.DateTimeFormat.
 *
 * Why Intl instead of moment/luxon/date-fns-tz?
 *  - Zero bundle cost: the IANA tz database ships with every modern browser.
 *  - DST is resolved by the platform for the given instant, so "18:00 in London"
 *    is correct in both GMT and BST without any hard-coded offsets.
 */

import type { LocalClock } from '../types';

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Creating Intl.DateTimeFormat instances is relatively expensive, and we tick
 * every second for 15+ zones — so formatters are cached per time zone.
 */
const clockFormatters = new Map<string, Intl.DateTimeFormat>();
const offsetFormatters = new Map<string, Intl.DateTimeFormat>();

function getClockFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = clockFormatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23', // 0–23; avoids the "24:00" quirk of hour12:false in some engines
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'short',
    });
    clockFormatters.set(timeZone, fmt);
  }
  return fmt;
}

/** Returns the wall-clock time of `timeZone` at the instant `date`. */
export function getLocalClock(date: Date, timeZone: string): LocalClock {
  const parts = getClockFormatter(timeZone).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '0';

  const hour = Number(get('hour')) % 24; // defensive: never trust "24"
  const minute = Number(get('minute'));
  const second = Number(get('second'));
  const weekday = WEEKDAY_INDEX[get('weekday')] ?? 0;

  return {
    hour,
    minute,
    second,
    weekday,
    secondsOfDay: hour * 3600 + minute * 60 + second,
  };
}

/** Returns true if `timeZone` is a valid IANA identifier in this runtime. */
export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone });
    return true;
  } catch {
    return false;
  }
}

/** "GMT+9", "GMT-3", "GMT+5:30" — the current UTC offset label (DST-aware). */
export function getUtcOffsetLabel(date: Date, timeZone: string): string {
  let fmt = offsetFormatters.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'shortOffset' });
    offsetFormatters.set(timeZone, fmt);
  }
  return fmt.formatToParts(date).find((p) => p.type === 'timeZoneName')?.value ?? '';
}

const pad = (n: number) => String(n).padStart(2, '0');

/** "18:04:09" */
export function formatClock(clock: LocalClock): string {
  return `${pad(clock.hour)}:${pad(clock.minute)}:${pad(clock.second)}`;
}

/** "Wed" */
export function formatWeekday(clock: LocalClock): string {
  return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][clock.weekday];
}

/**
 * Compact countdown: "3h 07m", "12m 05s", "45s".
 * Seconds are only shown below one hour to keep the label short on mobile.
 */
export function formatDuration(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${pad(m)}m`;
  if (m > 0) return `${m}m ${pad(sec)}s`;
  return `${sec}s`;
}

/** "06:07:00 UTC" — the reference instant shown in the header. */
export function formatUtc(date: Date): string {
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())} UTC`;
}
