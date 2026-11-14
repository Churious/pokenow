/**
 * ============================================================================
 *  PokeSpot — Global Hotspot Dataset
 * ============================================================================
 *
 *  This is the ONLY file you need to touch to add or fix a hotspot. 🙌
 *
 *  How to contribute (see CONTRIBUTING.md for the full checklist):
 *   1. Add one object to the `HOTSPOTS` array below.
 *   2. `id` must be unique, kebab-case, and stable (it may be used in URLs later).
 *   3. `timeZone` MUST be a valid IANA zone (https://en.wikipedia.org/wiki/List_of_tz_database_time_zones).
 *      Never use fixed offsets like "UTC+9" — DST is handled automatically.
 *   4. `lat` / `lng` are WGS84 decimal degrees. Please double-check them on
 *      OpenStreetMap or Google Maps and mention the source in your PR.
 *   5. `popularity` (1–100) is a relative community estimate used only to break
 *      ties between spots in the same tier. Explain your reasoning in the PR.
 *   6. Run `npm test` — the dataset is validated automatically (ranges, unique ids,
 *      valid time zones).
 *
 *  Coordinates point at a public landmark/park centre. They are reference points
 *  for planning, not guarantees of in-game Gym/PokéStop density.
 * ============================================================================
 */

import type { Hotspot } from '../types';

export const HOTSPOTS: readonly Hotspot[] = [
  // ───────────────────────── Asia-Pacific ─────────────────────────
  {
    id: 'wellington-waterfront',
    city: 'Wellington',
    spot: 'Civic Square & Waterfront',
    countryCode: 'NZ',
    region: 'Asia-Pacific',
    lat: -41.2889,
    lng: 174.7772,
    timeZone: 'Pacific/Auckland',
    popularity: 55,
    note: 'One of the first major cities to start each global event.',
  },
  {
    id: 'sydney-circular-quay',
    city: 'Sydney',
    spot: 'Circular Quay',
    countryCode: 'AU',
    region: 'Asia-Pacific',
    lat: -33.8611,
    lng: 151.2108,
    timeZone: 'Australia/Sydney',
    popularity: 78,
    note: 'Dense waterfront stops between the Opera House and The Rocks.',
  },
  {
    id: 'tokyo-shinjuku',
    city: 'Tokyo',
    spot: 'Shinjuku Station',
    countryCode: 'JP',
    region: 'Asia-Pacific',
    lat: 35.6896,
    lng: 139.7006,
    timeZone: 'Asia/Tokyo',
    popularity: 98,
    note: 'Massive player base — lobbies fill fast during Raid Hour.',
  },
  {
    id: 'busan-seomyeon',
    city: 'Busan',
    spot: 'Seomyeon',
    countryCode: 'KR',
    region: 'Asia-Pacific',
    lat: 35.1578,
    lng: 129.0592,
    timeZone: 'Asia/Seoul',
    popularity: 80,
    note: 'Busan’s downtown hub with tightly packed gyms.',
  },
  {
    id: 'taipei-main-station',
    city: 'Taipei',
    spot: 'Taipei Main Station',
    countryCode: 'TW',
    region: 'Asia-Pacific',
    lat: 25.0478,
    lng: 121.517,
    timeZone: 'Asia/Taipei',
    popularity: 90,
    note: 'Legendary community density around the station plaza.',
  },

  // ─────────────────────── Europe & Middle East ───────────────────────
  {
    id: 'dubai-downtown',
    city: 'Dubai',
    spot: 'Downtown (Burj Khalifa)',
    countryCode: 'AE',
    region: 'Europe & Middle East',
    lat: 25.1972,
    lng: 55.2744,
    timeZone: 'Asia/Dubai',
    popularity: 62,
    note: 'Bridges the gap between Asian and European evenings.',
  },
  {
    id: 'budapest-margaret-island',
    city: 'Budapest',
    spot: 'Margaret Island',
    countryCode: 'HU',
    region: 'Europe & Middle East',
    lat: 47.5267,
    lng: 19.0478,
    timeZone: 'Europe/Budapest',
    popularity: 60,
    note: 'Car-free park island in the Danube.',
  },
  {
    id: 'zaragoza-plaza-del-pilar',
    city: 'Zaragoza',
    spot: 'Plaza del Pilar',
    countryCode: 'ES',
    region: 'Europe & Middle East',
    lat: 41.6563,
    lng: -0.8773,
    timeZone: 'Europe/Madrid',
    popularity: 68,
    note: 'Historic plaza packed with stops along the Ebro.',
  },
  {
    id: 'london-hyde-park',
    city: 'London',
    spot: 'Hyde Park',
    countryCode: 'GB',
    region: 'Europe & Middle East',
    lat: 51.5073,
    lng: -0.1657,
    timeZone: 'Europe/London',
    popularity: 82,
    note: 'Large central park, popular for walking raid trains.',
  },

  // ───────────────────────────── Americas ─────────────────────────────
  {
    id: 'sao-paulo-ibirapuera',
    city: 'São Paulo',
    spot: 'Ibirapuera Park',
    countryCode: 'BR',
    region: 'Americas',
    lat: -23.5883,
    lng: -46.6589,
    timeZone: 'America/Sao_Paulo',
    popularity: 85,
    note: 'The most visited park in South America.',
  },
  {
    id: 'new-york-bryant-park',
    city: 'New York',
    spot: 'Bryant Park',
    countryCode: 'US',
    region: 'Americas',
    lat: 40.7536,
    lng: -73.9832,
    timeZone: 'America/New_York',
    popularity: 95,
    note: 'Midtown Manhattan — huge after-work raid crowds.',
  },
  {
    id: 'mexico-city-alameda-central',
    city: 'Mexico City',
    spot: 'Alameda Central',
    countryCode: 'MX',
    region: 'Americas',
    lat: 19.4356,
    lng: -99.1439,
    timeZone: 'America/Mexico_City',
    popularity: 75,
    note: 'Historic downtown park next to Bellas Artes.',
  },
  {
    id: 'san-francisco-pier-39',
    city: 'San Francisco',
    spot: 'Pier 39',
    countryCode: 'US',
    region: 'Americas',
    lat: 37.8087,
    lng: -122.4098,
    timeZone: 'America/Los_Angeles',
    popularity: 88,
    note: 'Fisherman’s Wharf waterfront with dense stops.',
  },
  {
    id: 'vancouver-stanley-park',
    city: 'Vancouver',
    spot: 'Stanley Park',
    countryCode: 'CA',
    region: 'Americas',
    lat: 49.3043,
    lng: -123.1443,
    timeZone: 'America/Vancouver',
    popularity: 70,
    note: 'Seawall loop — a classic West Coast raid walk.',
  },
  {
    id: 'honolulu-waikiki',
    city: 'Honolulu',
    spot: 'Waikiki Beach',
    countryCode: 'US',
    region: 'Americas',
    lat: 21.2766,
    lng: -157.827,
    timeZone: 'Pacific/Honolulu',
    popularity: 58,
    note: 'One of the last major cities to finish each global event.',
  },
];
