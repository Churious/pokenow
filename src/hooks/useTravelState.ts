import { useCallback, useState } from 'react';
import type { TravelState } from '../types';

const KEY = 'pokenow:travel';

function isTravelState(v: unknown): v is TravelState {
  if (!v || typeof v !== 'object') return false;
  const t = v as Record<string, unknown>;
  if (t.mode === 'free') return true;
  if (t.mode !== 'cooldown' && t.mode !== 'softban') return false;
  const o = t.origin as Record<string, unknown> | undefined;
  return (
    typeof t.lastActionAt === 'number' &&
    !!o &&
    typeof o.lat === 'number' &&
    typeof o.lng === 'number' &&
    typeof o.label === 'string'
  );
}

function load(): TravelState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed: unknown = JSON.parse(raw);
      if (isTravelState(parsed)) return parsed;
    }
  } catch {
    /* storage unavailable or corrupted — start fresh */
  }
  return { mode: 'free' };
}

/**
 * The player's cooldown situation, remembered in this browser only
 * (nothing is sent anywhere). Survives reloads so the countdown keeps going.
 */
export function useTravelState(): [TravelState, (next: TravelState) => void] {
  const [state, setState] = useState<TravelState>(load);

  const update = useCallback((next: TravelState) => {
    setState(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* private mode etc. — state still works for this visit */
    }
  }, []);

  return [state, update];
}
