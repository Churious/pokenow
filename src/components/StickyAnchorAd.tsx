import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { AdBanner } from './AdBanner';
import { CONFIG } from '../config';

const STORAGE_KEY = 'pokespot:anchor-dismissed';

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Mobile-only bottom anchor ad with a close button.
 *
 * AdSense sticky-ad rules this component is designed around:
 *  - fixed-size unit ≤ 300px wide (300×50 here),
 *  - moves only on the vertical axis (pinned to the bottom edge),
 *  - only ONE sticky ad visible at a time → do NOT also enable "Anchor ads"
 *    in AdSense Auto ads while this component is in use.
 *
 * The close button sits OUTSIDE the ad frame with its own hit area so a tap
 * on "close" can never land on the creative.
 */
export function StickyAnchorAd() {
  const [dismissed, setDismissed] = useState(readDismissed);

  // Reserve space at the bottom of the page so the anchor never covers content.
  useEffect(() => {
    if (dismissed) return;
    document.body.classList.add('pb-24', 'md:pb-0');
    return () => document.body.classList.remove('pb-24', 'md:pb-0');
  }, [dismissed]);

  if (dismissed) return null;

  const close = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* storage may be unavailable (private mode) — dismissal still works for this view */
    }
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-rule bg-night pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
      <div className="relative mx-auto flex max-w-md items-center justify-center px-12 py-2">
        <AdBanner slot={CONFIG.adsense.slots.anchor} variant="anchor" hideLabel />
        <button
          type="button"
          onClick={close}
          aria-label="Close advertisement"
          className="absolute top-1/2 right-1 grid size-10 -translate-y-1/2 place-items-center rounded-full text-dim hover:text-ink"
        >
          <X className="size-4" aria-hidden />
        </button>
        <span className="absolute top-1/2 left-3 -translate-y-1/2 text-xs text-faint">Ad</span>
      </div>
    </div>
  );
}
