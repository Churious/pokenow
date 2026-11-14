import { useEffect, useState } from 'react';
import { FEED_URL, parseFeed, type GoEvent } from '../lib/schedule';

/** Last good feed, so the schedule shows instantly on repeat visits and offline. */
const CACHE_KEY = 'pokenow:events';
/** Refetch when the cached copy is older than this. The feed itself updates a few times a day. */
const MAX_AGE_MS = 30 * 60 * 1000;
const TIMEOUT_MS = 8000;

interface Cached {
  at: number;
  events: GoEvent[];
}

function readCache(): Cached | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as Cached;
    return typeof v?.at === 'number' && Array.isArray(v.events) ? v : null;
  } catch {
    return null;
  }
}

export type FeedState =
  | { status: 'loading' }
  | { status: 'ready'; events: GoEvent[]; fetchedAt: number }
  | { status: 'error' };

/**
 * The community event feed (see lib/schedule.ts). Fetched in the visitor's
 * browser from GitHub; nothing is sent besides the request itself.
 */
export function useGoEvents(): FeedState {
  const [state, setState] = useState<FeedState>(() => {
    const c = readCache();
    return c ? { status: 'ready', events: c.events, fetchedAt: c.at } : { status: 'loading' };
  });

  useEffect(() => {
    const cached = readCache();
    if (cached && Date.now() - cached.at < MAX_AGE_MS) return;

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
    fetch(FEED_URL, { signal: ctrl.signal, cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(String(r.status)))))
      .then((raw: unknown) => {
        const events = parseFeed(raw);
        if (events.length === 0) throw new Error('empty feed');
        const at = Date.now();
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ at, events } satisfies Cached));
        } catch {
          /* storage full or blocked: still show this visit */
        }
        setState({ status: 'ready', events, fetchedAt: at });
      })
      .catch(() => {
        // Keep a stale copy if there is one; otherwise report the failure.
        if (!cached) setState({ status: 'error' });
      })
      .finally(() => clearTimeout(timer));
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, []);

  return state;
}
