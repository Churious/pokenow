/**
 * Runtime configuration, read from Vite env vars (see `.env.example`).
 * Everything is optional so the app runs out of the box with `npm run dev`.
 */

const env = import.meta.env;

export const CONFIG = {
  githubUrl: env.VITE_GITHUB_URL || 'https://github.com/Churious/pokenow',
  adsense: {
    /** "ca-pub-XXXXXXXXXXXXXXXX". When empty, no ad slots are rendered. */
    client: ((c) => (/^pub-/.test(c) ? `ca-${c}` : c))((env.VITE_ADSENSE_CLIENT || '').trim()),
    slots: {
      top: env.VITE_AD_SLOT_TOP || '',
      inFeed: env.VITE_AD_SLOT_INFEED || '',
      anchor: env.VITE_AD_SLOT_ANCHOR || '',
      sidebar: env.VITE_AD_SLOT_SIDEBAR || '',
    },
    /** In-feed units need the layout key generated in the AdSense UI. */
    inFeedLayoutKey: env.VITE_AD_INFEED_LAYOUT_KEY || '',
  },
} as const;
