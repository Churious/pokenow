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
├── main.tsx                 tiny entry: picks the language, loads bootstrap + dictionary in parallel
├── bootstrap.tsx            React mount (preloaded from the HTML by vite.config.ts)
├── App.tsx                  shell: home (hero + tabs) vs. spot page, ranking, list order
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
│   ├── events.ts            golden-hour / Raid Hour / Spotlight Hour countdowns
│   ├── schedule.ts          event feed parsing + local-time state (upcoming / live / further west)
│   ├── routes.ts            URL → spot, relative hrefs
│   ├── clipboard.ts         copy fallback for Copy / Share
│   └── github.ts            issue-form URLs
├── hooks/                   browser-only state
│   ├── useNow.ts            1 s ticker aligned to the second
│   ├── useTravelState.ts    last action place/time (localStorage)
│   ├── useFavorites.ts      pinned spots (localStorage)
│   └── useGoEvents.ts       community event feed, fetched + cached (localStorage)
├── i18n/
│   ├── types.ts             Messages contract — every key is typed
│   ├── load.ts              React-free: locale list, detection, lazy dictionary loading
│   ├── index.tsx            provider, duration/number formatting (re-exports load.ts)
│   └── locales/*.ts         one lazy-loaded file per language
├── components/              presentation (BestSpot, RoutePlanner, SpotRow, SpotPage, …)
├── types/index.ts           shared domain types
└── config.ts                env-driven config (GitHub URL, AdSense slots)
docs/OPERATING.md            live-site setup: domain, AdSense, analytics variables
scripts/site-pages.ts        emits <id>.html per spot, 404.html, sitemap.xml, robots.txt
scripts/review-issue.mjs     Gemini first-pass review comment on translation / community issues (issue-review.yml)
.github/ISSUE_TEMPLATE/      community.yml, hotspot.yml, translation.yml (GitHub issue forms)
privacy.html                 second Vite entry
worker/report-worker.js      Cloudflare Worker: site report forms → Turnstile → GitHub issue (setup: worker/README.md)
worker/wrangler.jsonc        Worker config; Workers Builds deploys it from Git (root dir `worker`, name must match)
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
- **Browser-only state.** `pokenow:travel`, `pokenow:favorites`, `pokenow:lang`, `pokenow:events` (feed
  cache), `pokenow:support-note` (when the ad-blocker note was closed) live in localStorage and are never sent anywhere. Don't add a backend for a feature that doesn't need one.
- **Static hosting.** `base: './'`, relative hrefs, all pages share one bundle. Don't hard-code the
  domain; `VITE_SITE_URL` drives canonical/OG URLs at build time.
- **Source-available, not open source.** License is PolyForm Noncommercial 1.0.0 (`LICENSE`, with a
  `Required Notice:` line); `package.json` says `PolyForm-Noncommercial-1.0.0`. Don't call the project "open source"
  in UI text, docs or metadata. Outside pull requests aren't accepted; feedback comes in as issues.
  Versions up to `8a25c82` were MIT.
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
- **Event schedule** — fetched at runtime from ScrapedDuck
  (`raw.githubusercontent.com/bigfoott/ScrapedDuck/data/events.min.json`), an open JSON mirror of the
  Leek Duck community calendar. Unofficial: the UI says so and links Leek Duck + official news.
  `lib/schedule.ts` parses it defensively (unknown types / bad dates dropped) and keeps **names only,
  never the feed's artwork URLs** (copyright). Feed times without `Z` are local wall-clock times in
  every zone; with `Z` one global instant. `hooks/useGoEvents.ts` caches the last good copy for 30 min
  (`pokenow:events`). Tests use a real-data fixture in `lib/__fixtures__/`.
  The feed also drives the Raid Hour / Spotlight Hour labels: `calendarFrom()` → `EventCalendar`
  (local dates with an 18:00 event) passed to `rankHotspots` / `planRoute`, and `nextEventAt()` for
  spot-page countdowns. Without the feed, the weekly rule in `lib/scoring.ts` applies (Raid Hour Wed,
  Spotlight Hour Thu since June 2026).
- **Home tabs** — `components/TabBar.tsx` (WAI-ARIA tabs, sticky). Hero (BestSpot) and the phone
  cooldown panel stay above the tabs; panels: spots (default), route (+ cooldown table), events, map
  (phones only — the desktop sidebar has it), guide. The tab is in the URL hash (`#route`, …).
- **Not-found page** — `scripts/site-pages.ts` emits `404.html` (noindex, `<base>` = site root,
  rewrites the URL to home) so old ids, typos and redirected links from the previous domain land
  on the app instead of GitHub's bare 404.
- **Reports without a GitHub account** — `components/ReportDialog.tsx` (`ReportProvider` + `ReportLink`)
  opens an in-site form for translation problems, hotspot suggestions and community listings; Turnstile is loaded only
  when a form opens. It posts to `worker/report-worker.js`, which checks origin + Turnstile + limits
  and opens a GitHub issue (visitor text fenced so it can't @mention or inject markup). Enabled only
  when `VITE_REPORT_URL` and `VITE_TURNSTILE_SITEKEY` are set; otherwise `ReportLink` falls back to the
  GitHub issue forms (`hotspot.yml`, `translation.yml`, `community.yml`). Community issues use the same `### Heading`
  layout as the GitHub form (values fenced) so `scripts/review-issue.mjs` reads both. Worker tests: `worker/report-worker.test.js`.
- **Hotspot suggestions** — accepted suggestions are copied by a maintainer into `data/hotspots.ts`.
- **Ad-blocker note** — `components/SupportNote.tsx` + `hooks/useAdBlocked.ts` + `lib/adblock.ts`. Only with AdSense
  configured: the loader tag's onload/onerror (set in vite.config.ts), a failed request for the loader, or a hidden
  bait element means a blocker. `?adcheck` logs the signals to the console. On entry (after a
  ~0.4 s check) a small non-modal card asks to allow ads (how-to for uBlock Origin / AdGuard); closing hides it for 7 days. Never a wall.
- **AI issue review** — `.github/workflows/issue-review.yml` runs `scripts/review-issue.mjs` when a `translation` or
  `community-listing` issue opens (or via Run workflow + issue number). It sends the issue plus the relevant files
  (en + reported locale; or hotspots.ts + communities.ts) to Gemini and posts one Korean comment. The model gets no tools;
  issue text is marked untrusted, mentions are defused, invite-link host and duplicates are checked in code. Needs the
  `GEMINI_API_KEY` Actions secret (skips without it); `GEMINI_MODEL` variable overrides the default. Advisory only.

## Common tasks

### Add a hotspot

1. Append to `src/data/hotspots.ts` (unique kebab-case id, ISO country code, region, lat/lng,
   IANA zone, source comment).
2. Run `npm test` (validates ids, ranges, zones) and `npm run build`.
3. Optional: `npm run og` for the preview card.

### The event schedule

Nothing to maintain: it comes from the feed. If the feed format changes, update `parseFeed` and the
fixture (`npm test` uses it). Never render the feed's image URLs.

### Change a translation

Reports arrive as `translation` issues (footer link; language + page prefilled via query params).

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
