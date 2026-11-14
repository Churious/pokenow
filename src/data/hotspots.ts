/**
 * ============================================================================
 *  PokeNow — Global Hotspot Dataset
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
 *   5. Say in a comment where the coordinates come from (a public community
 *      list, an official event page, Wikipedia/OSM…).
 *   6. Run `npm test` — the dataset is validated automatically (ranges, unique ids,
 *      valid time zones).
 *
 *  The list is the set of spots raid players commonly use (supplied by the
 *  maintainer, Nov 2026). Most pins are the exact coordinates published in
 *  community "best coordinates" lists; they were cross-checked against the
 *  distances a players' tool reports from a New York pin (40.755205, -73.982997)
 *  and agree to within ~0.1 km unless a comment says otherwise. They are
 *  reference points, not guarantees of in-game Gym/PokéStop density.
 * ============================================================================
 */

import type { Hotspot } from '../types';

export const HOTSPOTS: readonly Hotspot[] = [
  {
    // Source: itoolab.com "best coordinates" list (37.808600, -122.409800)
    id: 'pier-39',
    city: 'San Francisco',
    spot: 'Pier 39',
    countryCode: 'US',
    region: 'Americas',
    lat: 37.8086,
    lng: -122.4098,
    timeZone: 'America/Los_Angeles',
  },
  {
    // Source: Wikipedia (34.161, -118.168); cfbtrack.com (34.1613, -118.1676). Tour venue: pokemongo.com
    id: 'rose-bowl',
    city: 'Pasadena',
    spot: 'Rose Bowl Stadium',
    countryCode: 'US',
    region: 'Americas',
    lat: 34.1613,
    lng: -118.1676,
    timeZone: 'America/Los_Angeles',
    note: 'Venue of Pokémon GO Tour: Los Angeles.',
  },
  {
    // Source: itoolab.com / FlashGet lists (40.755205, -73.982997)
    id: 'new-york-midtown',
    city: 'New York',
    spot: 'Midtown (Bryant Park)',
    countryCode: 'US',
    region: 'Americas',
    lat: 40.755205,
    lng: -73.982997,
    timeZone: 'America/New_York',
  },
  {
    // Source: upcomer.com, coolmuster.com, itoolab.com (-11.562800, -77.270000)
    id: 'chancay',
    city: 'Chancay',
    spot: 'Town centre',
    countryCode: 'PE',
    region: 'Americas',
    lat: -11.5628,
    lng: -77.27,
    timeZone: 'America/Lima',
  },
  {
    // Source: upcomer.com, itoolab.com (-23.551200, -46.658400)
    id: 'sao-paulo-consolacao',
    city: 'São Paulo',
    spot: 'Consolação',
    countryCode: 'BR',
    region: 'Americas',
    lat: -23.5512,
    lng: -46.6584,
    timeZone: 'America/Sao_Paulo',
  },
  {
    // Source: latlong.net (37.393238, -5.991848). No community pin found; matches the reference distance within ~0.15 km. Safari Zone: pokemongo.com
    id: 'seville-setas',
    city: 'Seville',
    spot: 'Setas de Sevilla (Metropol Parasol)',
    countryCode: 'ES',
    region: 'Europe & Middle East',
    lat: 37.393238,
    lng: -5.991848,
    timeZone: 'Europe/Madrid',
    note: 'Seville hosted the 2022 Pokémon GO Safari Zone.',
  },
  {
    // Source: upcomer.com, itoolab.com, mobikin.com (41.6616, -0.8946); reference distance differs by ~0.1 km
    id: 'zaragoza',
    city: 'Zaragoza',
    spot: 'City centre',
    countryCode: 'ES',
    region: 'Europe & Middle East',
    lat: 41.6616,
    lng: -0.8946,
    timeZone: 'Europe/Madrid',
  },
  {
    // Source: mobikin.com, digistatement.com (47.531300, 19.052800)
    id: 'budapest',
    city: 'Budapest',
    spot: 'Margaret Island area',
    countryCode: 'HU',
    region: 'Europe & Middle East',
    lat: 47.5313,
    lng: 19.0528,
    timeZone: 'Europe/Budapest',
  },
  {
    // Source: geekersoft.com, unictool.com (39.641204, 22.412975); reference distance differs by ~0.4 km
    id: 'larissa',
    city: 'Larissa',
    spot: 'City centre',
    countryCode: 'GR',
    region: 'Europe & Middle East',
    lat: 39.641204,
    lng: 22.412975,
    timeZone: 'Europe/Athens',
  },
  {
    // Source: digistatement.com (38.4632, 27.2164)
    id: 'izmir-bornova',
    city: 'İzmir',
    spot: 'Bornova',
    countryCode: 'TR',
    region: 'Europe & Middle East',
    lat: 38.4632,
    lng: 27.2164,
    timeZone: 'Europe/Istanbul',
  },
  {
    // Source: digistatement.com (25.075201, 55.131068)
    id: 'dubai-marina',
    city: 'Dubai',
    spot: 'Dubai Marina',
    countryCode: 'AE',
    region: 'Europe & Middle East',
    lat: 25.075201,
    lng: 55.131068,
    timeZone: 'Asia/Dubai',
  },
  {
    // Source: commonly published pin (1.2834, 103.8607); ourcodeworld.com lists Marina Bay at 1.284202, 103.859042
    id: 'singapore-marina-bay',
    city: 'Singapore',
    spot: 'Marina Bay Sands',
    countryCode: 'SG',
    region: 'Asia-Pacific',
    lat: 1.2834,
    lng: 103.8607,
    timeZone: 'Asia/Singapore',
  },
  {
    // Source: imyfone.com (25.048323, 121.517228)
    id: 'taipei-main-station',
    city: 'Taipei',
    spot: 'Taipei Main Station area',
    countryCode: 'TW',
    region: 'Asia-Pacific',
    lat: 25.048323,
    lng: 121.517228,
    timeZone: 'Asia/Taipei',
  },
  {
    // Source: tuneskit.com (37.5665, 126.9780)
    id: 'seoul-city-hall',
    city: 'Seoul',
    spot: 'City Hall area',
    countryCode: 'KR',
    region: 'Asia-Pacific',
    lat: 37.5665,
    lng: 126.978,
    timeZone: 'Asia/Seoul',
  },
  {
    // Source: gamersdecide.com (34.650120, 135.510533)
    id: 'osaka-tennoji',
    city: 'Osaka',
    spot: 'Tennoji area',
    countryCode: 'JP',
    region: 'Asia-Pacific',
    lat: 34.65012,
    lng: 135.510533,
    timeZone: 'Asia/Tokyo',
  },
  {
    // Source: gamersdecide.com (35.155306, 136.919798)
    id: 'nagoya-tsurumai',
    city: 'Nagoya',
    spot: 'Tsurumai area',
    countryCode: 'JP',
    region: 'Asia-Pacific',
    lat: 35.155306,
    lng: 136.919798,
    timeZone: 'Asia/Tokyo',
  },
  {
    // Source: itoolab.com, mobikin.com (35.669590, 139.699690)
    id: 'tokyo-harajuku',
    city: 'Tokyo',
    spot: 'Harajuku area',
    countryCode: 'JP',
    region: 'Asia-Pacific',
    lat: 35.66959,
    lng: 139.69969,
    timeZone: 'Asia/Tokyo',
  },
  {
    // Source: gamersdecide.com (-33.862412, 151.210484); ourcodeworld.com lists Circular Quay at -33.861756, 151.210883
    id: 'sydney-circular-quay',
    city: 'Sydney',
    spot: 'Circular Quay',
    countryCode: 'AU',
    region: 'Asia-Pacific',
    lat: -33.862412,
    lng: 151.210484,
    timeZone: 'Australia/Sydney',
  },
  {
    // Source: imyfone.com (-36.852505, 174.763441)
    id: 'auckland-aotea-square',
    city: 'Auckland',
    spot: 'Aotea Square',
    countryCode: 'NZ',
    region: 'Asia-Pacific',
    lat: -36.852505,
    lng: 174.763441,
    timeZone: 'Pacific/Auckland',
  },
];
