/**
 * ============================================================================
 *  PokeNow — Raid community directory
 * ============================================================================
 *
 *  Listing a community is FREE. To add one, open the "Add a raid community"
 *  issue on GitHub; the maintainer adds accepted entries here.
 *
 *  Rules (enforced in review, also shown on the site):
 *   - Public, active Pokémon GO raid community with a working invite link.
 *   - No spoofing / GPS-change, account selling, botting or cheat-tool groups.
 *   - Safe for all ages; follows the platform's own rules.
 *
 *  `hotspots` ties a community to spot pages. Use `['*']` for global
 *  remote-raid communities (shown on the home page and every spot page).
 * ============================================================================
 */

export type CommunityPlatform = 'discord' | 'kakao' | 'line' | 'telegram' | 'whatsapp' | 'other';

export interface Community {
  /** Unique, kebab-case. */
  id: string;
  name: string;
  platform: CommunityPlatform;
  /** Public invite link. */
  url: string;
  /** Hotspot ids this community covers, or ['*'] for global. */
  hotspots: readonly string[];
  /** Main language(s) as BCP-47 codes, e.g. ['ko'] or ['en', 'es']. */
  languages: readonly string[];
  /** One short line in the community's own words (optional). */
  description?: string;
  /** ISO date the invite link was last checked. */
  checkedAt: string;
}

export const COMMUNITIES: readonly Community[] = [];

/** Communities for a spot page (spot-specific first, then global). */
export function communitiesFor(hotspotId: string | null, list: readonly Community[] = COMMUNITIES): Community[] {
  const local = hotspotId ? list.filter((c) => c.hotspots.includes(hotspotId)) : [];
  const global = list.filter((c) => c.hotspots.includes('*'));
  return [...local, ...global];
}

/** Full directory for the Communities tab (global first, then spot-specific). */
export function allCommunities(list: readonly Community[] = COMMUNITIES): Community[] {
  const global = list.filter((c) => c.hotspots.includes('*'));
  const local = list.filter((c) => !c.hotspots.includes('*'));
  return [...global, ...local];
}
