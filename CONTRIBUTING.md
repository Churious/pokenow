# Contributing to PokeSpot

Thanks for helping! The most common contribution is **adding or fixing a hotspot**, and it only touches one file.

## Add a hotspot

1. Edit [`src/data/hotspots.ts`](src/data/hotspots.ts) and append an object:

   ```ts
   {
     id: 'seoul-gwanghwamun',          // unique, kebab-case, never renamed later
     city: 'Seoul',
     spot: 'Gwanghwamun Square',
     countryCode: 'KR',                // ISO 3166-1 alpha-2
     region: 'Asia-Pacific',           // 'Asia-Pacific' | 'Europe & Middle East' | 'Americas'
     lat: 37.5720,                     // WGS84, 4–6 decimals
     lng: 126.9769,
     timeZone: 'Asia/Seoul',           // IANA zone — never "UTC+9"
     popularity: 85,                   // 1–100, relative community estimate
     note: 'Optional one-liner.',
   }
   ```

2. Run the checks:

   ```bash
   npm test        # validates ids, ranges and time zones for every hotspot
   npm run build   # type-check + production build
   ```

3. In the PR description, include:
   - the source you used to verify the coordinates (OpenStreetMap / Google Maps link),
   - a short justification for the `popularity` value.

## Code changes

- Keep business logic pure and in `src/lib/` (no React imports) so it stays testable.
- Add/adjust tests in `src/lib/*.test.ts` for any change to scoring or time handling.
- UI text is English. Keep components small and typed.
- Don't add franchise logos, sprites or artwork — the project must stay free of copyrighted assets.
