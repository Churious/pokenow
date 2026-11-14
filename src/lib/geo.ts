/** Geographic helpers (no dependencies). */

import type { Hotspot } from '../types';

const EARTH_RADIUS_KM = 6371.0088; // IUGG mean Earth radius

/** Great-circle distance in km (haversine). Accurate to ~0.5% — fine for planning. */
export function distanceKm(a: Pick<Hotspot, 'lat' | 'lng'>, b: Pick<Hotspot, 'lat' | 'lng'>): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** "40.7536, -73.9832" — the exact string copied to the clipboard. */
export function formatCoords(h: Pick<Hotspot, 'lat' | 'lng'>, digits = 4): string {
  return `${h.lat.toFixed(digits)}, ${h.lng.toFixed(digits)}`;
}
