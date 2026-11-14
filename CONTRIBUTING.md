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

   Optional: `npm run og` renders the link-preview image for the new page into `public/og/` (run `npx playwright install chromium` once first). Without it the page just uses the app icon as its preview.

3. In the PR description, include:
   - the source you used to verify the coordinates (OpenStreetMap / Google Maps link),
   - a short justification for the `popularity` value.

## Translations

UI text lives in `src/i18n/locales/<code>.ts`, one file per language Pokémon GO supports. English (`en.ts`) is the source; TypeScript fails the build if any key is missing.

- Use the **official in-game names** for events (Raid Hour, Spotlight Hour) where they exist. Turkish, Thai, Indonesian and Hindi currently keep the English event names; corrections from native speakers are very welcome.
- Hotspot names (city, spot) stay in English on purpose.
- `npm test` checks that every locale has exactly the same keys as English.
- Each language is loaded only when it's used. A new language needs a line in `LOADERS` and `LANGUAGE_NAMES` in `src/i18n/index.tsx`.

## Code changes

- Keep business logic pure and in `src/lib/` (no React imports) so it stays testable.
- Add/adjust tests in `src/lib/*.test.ts` for any change to scoring or time handling.
- UI text is English. Keep components small and typed.
- Don't add franchise logos, sprites or artwork — the project must stay free of copyrighted assets.
