/**
 * Runtime configuration, read from Vite env vars (see `.env.example`).
 * Everything is optional so the app runs out of the box with `npm run dev`.
 */

const env = import.meta.env;

export const CONFIG = {
  githubUrl: env.VITE_GITHUB_URL || 'https://github.com/Churious/pokespot',
  /** GitHub Sponsors profile (shown as the Sponsor link in the footer). */
  sponsorUrl: env.VITE_SPONSOR_URL || 'https://github.com/sponsors/Churious',
  adsense: {
    /** "ca-pub-XXXXXXXXXXXXXXXX". When empty, ad slots render dev placeholders only. */
    client: env.VITE_ADSENSE_CLIENT || '',
    slots: {
      top: env.VITE_AD_SLOT_TOP || '',
      inFeed: env.VITE_AD_SLOT_INFEED || '',
      anchor: env.VITE_AD_SLOT_ANCHOR || '',
    },
    /** In-feed units need the layout key generated in the AdSense UI. */
    inFeedLayoutKey: env.VITE_AD_INFEED_LAYOUT_KEY || '',
  },
} as const;
