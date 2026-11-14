# CLAUDE.md

Orientation for future Claude sessions working on PokeNow. Read this first, keep it current when
the architecture or conventions change, and prefer small focused PRs over large rewrites.

## What this is

A fan-made, statically built Pokémon GO raid-hotspot finder: live local times, a ranking engine, a
cooldown-aware route planner, per-spot pages, maps and a free community directory. No backend, no
accounts, no app database. React 19 + TypeScript + Vite 8 + Tailwind 4 + Leaflet.

## Commands

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests (scoring, planner, favorites, i18n, dataset)
npm run build    # type-check + production build → dist/
npm run og       # optional link-preview images (needs: npx playwright install chromium)
```

Run `npm test` and `npm run build` before opening a PR. There is no linter or formatter script; match
the surrounding style (2 spaces, single quotes, ~120-column lines).

## Map of the code

```
src/
├── App.tsx                  shell: home vs. spot page, ranking, list order
├── data/
│   ├── hotspots.ts          the dataset — most data PRs only touch this
│   ├── communities.ts       free community directory
│   └── cooldowns.ts         unofficial community cooldown table
├── lib/                     pure logic, no React, unit-tested
│   ├── scoring.ts           ranking engine (tiers, cooldown-aware plan)
│   ├── planner.ts           A → wait → B → C cooldown route
│   ├── favorites.ts         pinned ids + stable pin-first ordering
│   ├── time.ts              Intl time-zone helpers + formatters
│   ├── geo.ts               haversine distance, coordinate string
│   ├── events.ts            golden-hour / Raid Hour countdowns
│   ├── routes.ts            URL → spot, relative hrefs
│   ├── clipboard.ts         copy fallback for Copy / Share
│   └── github.ts            issue-form URLs
├── hooks/                   browser-only state
│   ├── useNow.ts            1 s ticker aligned to the second
│   ├── useTravelState.ts    last action place/time (localStorage)
│   └── useFavorites.ts      pinned spots (localStorage)
├── i18n/
│   ├── types.ts             Messages contract — every key is typed
│   ├── index.tsx            provider, detection, duration/number formatting
│   └── locales/*.ts         one lazy-loaded file per language
├── components/              presentation (BestSpot, RoutePlanner, SpotRow, SpotPage, …)
├── types/index.ts           shared domain types
└── config.ts                env-driven config (GitHub URL, AdSense slots)
scripts/site-pages.ts        emits <id>.html per spot, 404.html, sitemap.xml, robots.txt
.github/ISSUE_TEMPLATE/      community.yml + hotspot.yml (GitHub issue forms)
privacy.html                 second Vite entry
```

State flows one way: `App` reads `useNow`, `useTravelState`, `useFavorites` and passes data down;
pure logic lives in `lib/`; components render and call callbacks. `rankHotspots()` runs every tick
(19 spots is cheap).

## Invariants

- **Keep business logic pure and in `src/lib/`**, with tests in `src/lib/*.test.ts`. Don't import
  React there.
- **Every UI string is translated.** Add the key to `src/i18n/types.ts` and `en.ts` (source), then to
  all 14 locale files. `npm test` fails if the key sets differ. UI text in code is English; other
  locales live in `src/i18n/locales/`.
- **Hotspot ids are permanent.** They are URLs and the key for localStorage pins. Add new spots at
  the end of `HOTSPOTS` with a comment naming the coordinate source.
- **Time zones are IANA names, never fixed offsets.** DST is resolved by `Intl`; don't add a date
  library.
- **No copyrighted assets.** No sprites, franchise logos or artwork.
- **No location-changing tools or endorsement.** The cooldown feature describes a game mechanic;
  keep wording neutral and keep the fan-made disclaimer. Never claim to show Gym/PokéStop locations.
- **Browser-only state.** `pokenow:travel`, `pokenow:favorites`, `pokenow:lang` live in
  localStorage and are never sent anywhere. Don't add a backend for a feature that doesn't need one.
- **Static hosting.** `base: './'`, relative hrefs, all pages share one bundle. Don't hard-code the
  domain; `VITE_SITE_URL` drives canonical/OG URLs at build time.
- **Ads:** only one sticky unit may be mounted at a time (bottom anchor below 768 px, sidebar from
  1024 px). Don't render hidden AdSense slots.

## Feature map (added Nov 2026)

- **Cooldown route** — `lib/planner.ts`, `components/RoutePlanner.tsx`. First stop = current
  recommendation; each stop lasts 30 min or until its window closes; later legs wait
  `cooldown(distance)` measured from the previous stop; only golden/peak arrivals with 15+ min left,
  max 3 stops, 6 h horizon. Tests: `lib/planner.test.ts`.
- **Pinned spots** — `lib/favorites.ts`, `hooks/useFavorites.ts`, `components/FavoriteButton.tsx`.
  Pinned rows float to the top while keeping their real rank; ordering is stable (`pinFirst`).
  Tests: `lib/favorites.test.ts`.
- **Share** — `components/ShareSpotButton.tsx`: native Web Share where available, otherwise
  clipboard. Payload = place, coordinates, current local time + UTC offset, URL.
- **Not-found page** — `scripts/site-pages.ts` emits `404.html` (noindex, `<base>` = site root,
  rewrites the URL to home) so old ids, typos and redirected links from the previous domain land
  on the app instead of GitHub's bare 404.
- **Hotspot suggestions** — `.github/ISSUE_TEMPLATE/hotspot.yml`, linked from the ranking via
  `lib/github.ts`. A maintainer transfers accepted suggestions into `data/hotspots.ts`.

## Common tasks

### Add a hotspot

1. Append to `src/data/hotspots.ts` (unique kebab-case id, ISO country code, region, lat/lng,
   IANA zone, source comment).
2. Run `npm test` (validates ids, ranges, zones) and `npm run build`.
3. Optional: `npm run og` for the preview card.

### Change a translation

Edit `en.ts` first, then the same keys in every locale. Use the official in-game event names where
they exist. Hotspot names (city/spot) stay in English on purpose.

### Add a language

Add a locale file, a line in `LOADERS` and `LANGUAGE_NAMES` in `src/i18n/index.tsx`, and handle its
BCP-47 tags in `matchLocale` if needed. The key-equality test is the safety net.

### Add a page type

Read the path in `lib/routes.ts`, render it in `App.tsx`, and emit static HTML/meta in
`scripts/site-pages.ts` if it should be crawlable. Add the URL to that script's sitemap list.

## Git / PR conventions

- Branch from `main` as `feat/<topic>` or `fix/<topic>`; one feature per PR.
- Imperative commit subjects with a scope (`feat(route): …`). Explain the why, assumptions and
  trade-offs in the body — future sessions rely on this as much as on the code.
- PR description: what/why, behaviour, files touched, tests run, and screenshots for UI changes.
  Call out follow-ups instead of hiding them.
- Merge into `main` through a PR (merge commits keep the individual feature commits). A push to
  `main` triggers the GitHub Pages deploy.
