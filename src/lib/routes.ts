/**
 * URL helpers for the static, multi-page site.
 *
 * Every hotspot gets its own page at `<base>/<id>` (built as `<id>.html`, which
 * GitHub Pages and most static hosts also serve without the extension).
 * Links are relative, so the same build works under /pokespot/ or a custom domain.
 */

import { HOTSPOTS } from '../data/hotspots';
import type { Hotspot } from '../types';

export const spotHref = (id: string): string => `./${id}`;
export const homeHref = './';

/** The hotspot whose page we're on, from the last path segment ("/pokespot/tokyo-shinjuku(.html)"). */
export function currentSpot(pathname: string = window.location.pathname): Hotspot | null {
  const last = pathname.replace(/\/+$/, '').split('/').pop() ?? '';
  const id = decodeURIComponent(last).replace(/\.html$/, '');
  return HOTSPOTS.find((h) => h.id === id) ?? null;
}
