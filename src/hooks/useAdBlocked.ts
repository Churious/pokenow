import { useEffect, useState } from 'react';
import { CONFIG } from '../config';
import { BAIT_CLASSES, type BlockSignals, isBlocked } from '../lib/adblock';

const LOADER = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';

const pageLoaded = () =>
  new Promise<void>((resolve) => {
    if (document.readyState === 'complete') resolve();
    else window.addEventListener('load', () => resolve(), { once: true });
  });
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Ad-blocker check. Only runs when AdSense is configured and the browser is online, so a dropped connection
 * isn't mistaken for a blocker. Three signals (see lib/adblock.ts for how they combine):
 *  - script: the AdSense loader tag in <head> fired `error`, or still hasn't fired `load` after the page `load`
 *    event (async scripts delay it) plus a grace period. Its onload/onerror attributes set
 *    `window.__pokenowAds` (vite.config.ts). Catches blockers that drop the script, e.g. Safari content blockers.
 *  - network: a no-cors request for the loader fails (extensions, Brave Shields, DNS blockers).
 *  - cosmetic: an off-screen element with common ad class names gets hidden by element-hiding filters.
 * Add `?adcheck` to the URL to log the signals to the console.
 */
export function useAdBlocked(delayMs = 400): BlockSignals | null {
  const [signals, setSignals] = useState<BlockSignals | null>(null);

  useEffect(() => {
    if (!CONFIG.adsense.client) return;
    let cancelled = false;

    const run = async () => {
      await sleep(delayMs);
      if (!navigator.onLine) return;
      const bait = document.createElement('div');
      bait.className = BAIT_CLASSES;
      bait.setAttribute('aria-hidden', 'true');
      bait.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:2px;height:2px;';
      bait.innerHTML = '&nbsp;';
      document.body.appendChild(bait);

      let network = false;
      try {
        await fetch(`${LOADER}?client=${encodeURIComponent(CONFIG.adsense.client)}`, {
          method: 'HEAD',
          mode: 'no-cors',
          cache: 'no-store',
        });
      } catch {
        network = navigator.onLine;
      }
      // Give element-hiding filters a moment; some apply asynchronously.
      await sleep(600);
      const style = getComputedStyle(bait);
      const cosmetic = bait.offsetHeight === 0 || style.display === 'none' || style.visibility === 'hidden';
      bait.remove();

      const hasLoaderTag = Boolean(document.getElementById('adsbygoogle-js'));
      let script = false;
      if (hasLoaderTag && !network && !cosmetic) {
        await pageLoaded();
        await sleep(2500);
        // The loader tag records its own load/error (vite.config.ts). An error, or no load event at all once the page
        // has finished loading, means the script was blocked.
        script = navigator.onLine && window.__pokenowAds !== 'loaded';
      }

      const result = { network, cosmetic, script };
      if (new URLSearchParams(location.search).has('adcheck')) console.info('[pokenow] ad-block check', result, isBlocked(result));
      if (!cancelled) setSignals(result);
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [delayMs]);

  return signals;
}
