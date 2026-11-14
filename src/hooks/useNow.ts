import { useEffect, useState } from 'react';

/**
 * Returns the current instant, re-rendering once per second.
 * Ticks are aligned to the wall-clock second boundary so every card flips at
 * the same moment, and re-sync immediately when the tab becomes visible again
 * (mobile browsers throttle timers in background tabs).
 */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let interval: number | undefined;
    const tick = () => setNow(new Date());

    const timeout = window.setTimeout(() => {
      tick();
      interval = window.setInterval(tick, intervalMs);
    }, intervalMs - (Date.now() % intervalMs));

    const onVisible = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.clearTimeout(timeout);
      if (interval !== undefined) window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [intervalMs]);

  return now;
}
