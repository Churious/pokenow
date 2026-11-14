import { useEffect, useRef } from 'react';
import { CONFIG } from '../config';
import { useI18n } from '../i18n';

/**
 * Google AdSense slot.
 *
 * Policy-minded defaults (accidental clicks are the #1 cause of AdSense strikes):
 *  - Every slot is wrapped in generous vertical margins and labelled "Advertisement",
 *    so it can never be mistaken for app content or sit flush against a button.
 *  - Height is reserved up front to avoid layout shift (CLS) pushing buttons under
 *    the user's thumb while an ad loads.
 *  - Without VITE_ADSENSE_CLIENT, nothing is requested from Google; a dashed
 *    placeholder is shown instead so layout can be reviewed in development.
 */

const SCRIPT_ID = 'adsbygoogle-js';

function ensureAdSenseScript(client: string) {
  if (document.getElementById(SCRIPT_ID)) return;
  const s = document.createElement('script');
  s.id = SCRIPT_ID;
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(client)}`;
  document.head.appendChild(s);
}

type Variant =
  /** Responsive display banner (top of page). */
  | 'display'
  /** Native in-feed unit (between hero and list). */
  | 'in-feed'
  /** Fixed 300×50 unit for the sticky anchor (≤300px wide per AdSense sticky rules). */
  | 'anchor'
  /** Fixed 300×250 unit for the desktop sidebar (≤300px wide, so it may be sticky). */
  | 'sidebar';

interface Props {
  slot: string;
  variant?: Variant;
  /** Required by AdSense for in-feed units. */
  layoutKey?: string;
  className?: string;
  /** Hide the "Advertisement" label (only for the anchor, which has its own frame). */
  hideLabel?: boolean;
}

const RESERVED_HEIGHT: Record<Variant, string> = {
  display: 'min-h-[100px] md:min-h-[90px]',
  'in-feed': 'min-h-[120px]',
  anchor: 'h-[50px]',
  sidebar: 'h-[250px]',
};

export function AdBanner({ slot, variant = 'display', layoutKey, className = '', hideLabel }: Props) {
  const client = CONFIG.adsense.client;
  const enabled = Boolean(client && slot);
  const pushed = useRef(false);
  const { t } = useI18n();

  useEffect(() => {
    if (!enabled || pushed.current) return;
    ensureAdSenseScript(client);
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true; // guard against React StrictMode double-invocation
    } catch {
      /* ad blockers or duplicate pushes — fail silently */
    }
  }, [enabled, client]);

  const insProps: Record<string, string> =
    variant === 'in-feed'
      ? { 'data-ad-format': 'fluid', ...(layoutKey ? { 'data-ad-layout-key': layoutKey } : {}) }
      : variant === 'anchor' || variant === 'sidebar'
        ? {}
        : { 'data-ad-format': 'auto', 'data-full-width-responsive': 'true' };

  return (
    <aside aria-label={t.ads.label} className={`w-full ${className}`}>
      {!hideLabel && (
        <p className="mb-1 text-xs text-faint">{t.ads.label}</p>
      )}
      <div className={`flex w-full items-center justify-center overflow-hidden ${RESERVED_HEIGHT[variant]}`}>
        {enabled ? (
          <ins
            className="adsbygoogle"
            style={
              variant === 'anchor'
                ? { display: 'inline-block', width: 300, height: 50 }
                : variant === 'sidebar'
                  ? { display: 'inline-block', width: 300, height: 250 }
                  : { display: 'block', width: '100%' }
            }
            data-ad-client={client}
            data-ad-slot={slot}
            {...insProps}
          />
        ) : (
          <div
            className={`flex w-full items-center justify-center rounded-md border border-dashed border-rule text-xs text-faint ${
              variant === 'anchor'
                ? 'h-[50px] max-w-[300px]'
                : variant === 'sidebar'
                  ? 'h-[250px] max-w-[300px]'
                  : 'h-full min-h-[inherit]'
            }`}
          >
            Ad slot ({variant})
          </div>
        )}
      </div>
    </aside>
  );
}
