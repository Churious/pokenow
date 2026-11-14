# Contributing to PokeNow

Thanks for helping! The most common contribution is **adding or fixing a hotspot**, and it only touches one file.

## Suggest a hotspot (no code)

Click **Suggest a spot** under the ranking on the site, or open the
[hotspot suggestion form](https://github.com/Churious/pokenow/issues/new?template=hotspot.yml). It asks for the city,
spot, country code, region, coordinates, IANA time zone and the public source of the coordinates. A maintainer checks it
and adds the entry to `src/data/hotspots.ts`, so you don't need to touch any code.

If you'd rather open a pull request yourself, follow the section below.

## Add a hotspot

1. Edit [`src/data/hotspots.ts`](src/data/hotspots.ts) and append an object:

   ```ts
   {
     // Source: where these coordinates come from (link or list name)
     id: 'seoul-gwanghwamun',          // unique, kebab-case, never renamed later
     city: 'Seoul',
     spot: 'Gwanghwamun Square',
     countryCode: 'KR',                // ISO 3166-1 alpha-2
     region: 'Asia-Pacific',           // 'Asia-Pacific' | 'Europe & Middle East' | 'Americas'
     lat: 37.5720,                     // WGS84, 4–6 decimals
     lng: 126.9769,
     timeZone: 'Asia/Seoul',           // IANA zone — never "UTC+9"
     note: 'Optional factual one-liner.',
   }
   ```

2. Run the checks:

   ```bash
   npm test        # validates ids, ranges and time zones for every hotspot
   npm run build   # type-check + production build
   ```

   Optional: `npm run og` renders the link-preview image for the new page into `public/og/` (run `npx playwright install chromium` once first). Without it the page just uses the app icon as its preview.

3. In the PR description, include:
   - where the coordinates come from (also as a comment above the entry),

## Translations

UI text lives in `src/i18n/locales/<code>.ts`, one file per language Pokémon GO supports. English (`en.ts`) is the source; TypeScript fails the build if any key is missing.

- Use the **official in-game names** for events (Raid Hour, Spotlight Hour) where they exist. Turkish, Thai, Indonesian and Hindi currently keep the English event names; corrections from native speakers are very welcome.
- Hotspot names (city, spot) stay in English on purpose.
- Not a coder? Use the **Report a translation problem** link in the site footer — it opens an issue form with your language and page filled in.
- `npm test` checks that every locale has exactly the same keys as English.
- Each language is loaded only when it's used. A new language needs a line in `LOADERS` and `LANGUAGE_NAMES` in `src/i18n/index.tsx`.

## Code changes

- Keep business logic pure and in `src/lib/` (no React imports) so it stays testable.
- Add/adjust tests in `src/lib/*.test.ts` for any change to scoring or time handling.
- UI text is English. Keep components small and typed.
- Don't add franchise logos, sprites or artwork — the project must stay free of copyrighted assets.
