/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GITHUB_URL?: string;
  readonly VITE_ADSENSE_CLIENT?: string;
  readonly VITE_AD_SLOT_TOP?: string;
  readonly VITE_AD_SLOT_INFEED?: string;
  readonly VITE_AD_SLOT_ANCHOR?: string;
  readonly VITE_AD_INFEED_LAYOUT_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  adsbygoogle?: unknown[];
}
