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
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  adsbygoogle?: unknown[];
}
