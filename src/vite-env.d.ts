/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GITHUB_URL?: string;
  /** Absolute site URL used for canonical links and the sitemap. */
  readonly VITE_SITE_URL?: string;
  readonly VITE_CF_ANALYTICS_TOKEN?: string;
  readonly VITE_GOATCOUNTER_CODE?: string;
  readonly VITE_ADSENSE_CLIENT?: string;
  readonly VITE_AD_SLOT_TOP?: string;
  readonly VITE_AD_SLOT_INFEED?: string;
  readonly VITE_AD_SLOT_ANCHOR?: string;
  readonly VITE_AD_SLOT_SIDEBAR?: string;
  readonly VITE_AD_INFEED_LAYOUT_KEY?: string;
  readonly VITE_REPORT_URL?: string;
  readonly VITE_TURNSTILE_SITEKEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  /** AdSense queue; the real loader sets `loaded: true` once it has run (used by hooks/useAdBlocked.ts). */
  adsbygoogle?: unknown[] & { loaded?: boolean };
  /** Set by the AdSense loader tag's onload/onerror (vite.config.ts). */
  __pokenowAds?: 'loaded' | 'error';
}
