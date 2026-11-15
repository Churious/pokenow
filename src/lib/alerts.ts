import type { ScoredHotspot, TravelState } from '../types';
import { nextGoldenWindow } from './events';

export const ALERTS_KEY = 'pokenow:alerts';
export const GOLDEN_ALERT_WINDOW_SEC = 600; // 10 minutes before 18:00

export interface AlertEvent {
  id: string;
  kind: 'cooldown' | 'golden';
  city?: string;
}

export function readAlertsEnabled(): boolean {
  try {
    return localStorage.getItem(ALERTS_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeAlertsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(ALERTS_KEY, enabled ? '1' : '0');
  } catch {
    /* ignore */
  }
}

/**
 * Pure alert evaluator: returns alerts that should fire on this tick without
 * repeating any key already in `fired`.
 */
export function evaluateAlerts(
  ranked: readonly ScoredHotspot[],
  travel: TravelState,
  favorites: ReadonlySet<string>,
  now: Date,
  fired: ReadonlySet<string>,
  wasCoolingDown: boolean,
): { alerts: AlertEvent[]; isCoolingDown: boolean } {
  const alerts: AlertEvent[] = [];

  // 1. Cooldown completion: fires when transitioning from cooling down -> 0s wait across all spots.
  const maxWait = ranked.reduce((m, s) => Math.max(m, s.plan.waitSeconds), 0);
  const isCoolingDown = travel.mode !== 'free' && maxWait > 0;
  if (wasCoolingDown && travel.mode !== 'free' && !isCoolingDown) {
    const key = `cd:${travel.lastActionAt}`;
    if (!fired.has(key)) alerts.push({ id: key, kind: 'cooldown' });
  }

  // 2. Pinned spots entering Golden Hour (within 10 min before 18:00 local).
  const day = now.toISOString().slice(0, 10);
  for (const s of ranked) {
    if (!favorites.has(s.hotspot.id)) continue;
    const timing = nextGoldenWindow(s.clock, null);
    if (!timing.live && timing.secondsUntil > 0 && timing.secondsUntil <= GOLDEN_ALERT_WINDOW_SEC) {
      const key = `golden:${s.hotspot.id}:${day}`;
      if (!fired.has(key)) alerts.push({ id: key, kind: 'golden', city: s.hotspot.city });
    }
  }

  return { alerts, isCoolingDown };
}
