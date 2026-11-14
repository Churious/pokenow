import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { AdBanner } from './AdBanner';
import { CONFIG } from '../config';
import { useI18n } from '../i18n';
import { MQ, useMediaQuery } from '../hooks/useMediaQuery';

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
  const { t } = useI18n();
  const isDesktop = useMediaQuery(MQ.md);

  // Reserve space at the bottom of the page so the anchor never covers content.
  useEffect(() => {
    if (dismissed || isDesktop) return;
    document.body.classList.add('pb-28', 'md:pb-0');
    return () => document.body.classList.remove('pb-28', 'md:pb-0');
  }, [dismissed, isDesktop]);

  // Mobile only: on wider screens the sidebar unit is the single sticky ad.
  if (dismissed || isDesktop) return null;

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
      {/* Top row: label + close, kept off the creative. Below: the 300×50 unit. */}
      <div className="mx-auto max-w-md px-3 pt-1 pb-2">
        <div className="flex h-7 items-center justify-between">
          <span className="text-[11px] text-faint">{t.ads.short}</span>
          <button
            type="button"
            onClick={close}
            aria-label={t.ads.close}
            className="-mr-2 grid size-9 place-items-center rounded-full text-dim hover:text-ink"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <AdBanner slot={CONFIG.adsense.slots.anchor} variant="anchor" hideLabel />
      </div>
    </div>
  );
}
