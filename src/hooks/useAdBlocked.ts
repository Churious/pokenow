import { useEffect, useState } from 'react';
import { CONFIG } from '../config';
import { BAIT_CLASSES } from '../lib/adblock';

const LOADER = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

/**
 * true when an ad blocker is active. Only runs when AdSense is configured (otherwise there are no ads to block)
 * and only while online, so a dropped connection isn't mistaken for a blocker.
 *
 * Two checks, either one counts:
 *  - network: request the AdSense loader; extensions (uBlock Origin, AdGuard, Brave Shields) and DNS blockers make
 *    the request fail outright. `no-cors` keeps a successful response opaque; we only look at failure.
 *  - cosmetic: an off-screen element with common ad class names gets hidden by element-hiding filters.
 */
export function useAdBlocked(delayMs = 3000): boolean {
  const [blocked, setBlocked] = useState(false);

  useEffect(() => {
    if (!CONFIG.adsense.client) return;
    let cancelled = false;

    const run = async () => {
      if (!navigator.onLine) return;
      const bait = document.createElement('div');
      bait.className = BAIT_CLASSES;
      bait.setAttribute('aria-hidden', 'true');
      bait.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:2px;height:2px;';
      bait.innerHTML = '&nbsp;';
      document.body.appendChild(bait);

      let networkBlocked = false;
      try {
        await fetch(`${LOADER}?client=${encodeURIComponent(CONFIG.adsense.client)}`, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store',
        });
      } catch {
        networkBlocked = navigator.onLine;
      }
      const style = getComputedStyle(bait);
      const cosmeticBlocked = bait.offsetHeight === 0 || style.display === 'none' || style.visibility === 'hidden';
      bait.remove();
      if (!cancelled) setBlocked(networkBlocked || cosmeticBlocked);
    };

    const timer = window.setTimeout(() => void run(), delayMs);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [delayMs]);

  return blocked;
}
