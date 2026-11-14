# PokeSpot

**Find the best Pokémon GO raid hotspot on Earth — right now.**

PokeSpot checks the live local time of 15+ community-curated hotspots worldwide and recommends where raid lobbies are most likely to be full at this moment, with one-click coordinate copy.

> PokeSpot is a fan-made utility for tracking global raid hours and coordinating remote raids. Not affiliated with Niantic or The Pokémon Company.

## Features

- **Best Raid Spot Now** hero card, re-ranked every second
- Live local clocks (DST-aware via `Intl.DateTimeFormat`, no date libraries)
- Status badges: 🔥 Raid Hour / Spotlight Hour / Golden Time · 🟢 Active · 💤 Quiet
- `[Copy Coords]` with toast feedback (`40.7536, -73.9832` format)
- **Cooldown & soft-ban aware ranking**: tell PokeSpot where and when you last caught/spun/raided, and every spot shows its distance and remaining wait. Spots are ranked by the raid window they'll be in *when you can safely play there*. After 2 hours without an action, everything is free again.
- 24-hour dial: every hotspot plotted at its local time, golden hour and peak window highlighted
- Cooldown reference table (unofficial community values, rounded up to the safer side)
- **14 languages**, the ones Pokémon GO itself supports: English, French, German, Italian, Spanish (Spain), Spanish (Latin America), Portuguese (Brazil), Turkish, Indonesian, Korean, Japanese, Traditional Chinese, Thai, Hindi. Auto-detected from the browser, switchable in the header.
- **A page per hotspot** (`/<id>`): live clock, next golden hour / Raid Hour / Spotlight Hour countdowns, map, Google Maps & OpenStreetMap links, and a link to the official Campfire app for live raids. Each page has its own title, description and Open Graph tags, plus a sitemap.
- **Installable app (PWA)** with an offline app shell
- **Maps** (Leaflet + OpenStreetMap, lazy-loaded). PokéStop / Gym locations are intentionally not shown: there's no official public data for them.
- Mobile-first dark UI, AdSense-ready slots with policy-minded spacing

## Recommendation algorithm

| Tier | Local time | Meaning |
| --- | --- | --- |
| 1 🔥 Golden | 18:00 – 18:59 | Raid Hour (Wed) / Spotlight Hour (Tue) window |
| 2 🟢 Peak | 11:00 – 19:59 (not golden) | General raid activity |
| 3 ⏳ Upcoming | 20:00 – 10:59 | Ranked by time until the next window opens |

Tier 3 uses the soonest opening first. Spots that are still tied (several cities share a clock) are ordered by distance from your last action when you've set one, otherwise by id. There is no popularity weight, because there is no measured data for it. See [`src/lib/scoring.ts`](src/lib/scoring.ts).

**Cooldown / soft-ban mode.** With a last action location and time set, each spot gets `wait = max(0, cooldown(distance) − time since last action)` (capped at 2 h). The tier is evaluated at `now + wait`; a window with under 15 minutes left on arrival doesn't count. Within a tier, shorter waits win (10-minute buckets), then the nearer spot. The state is stored only in the browser's localStorage.

## Quick start

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests (scoring, DST, dataset validation)
npm run build    # type-check + production build → dist/
```

Requires Node `^20.19.0 || >=22.12.0` (Vite 8).

## Project structure

```
src/
├── data/
│   ├── hotspots.ts      ← add hotspots here (the only file most PRs touch)
│   └── cooldowns.ts     ← unofficial cooldown table
├── lib/
│   ├── time.ts          ← Intl-based tz helpers
│   ├── scoring.ts       ← pure ranking engine
│   ├── geo.ts           ← haversine + coordinate formatting
│   └── scoring.test.ts
├── i18n/
│   ├── types.ts         ← translation contract (every key typed)
│   ├── index.tsx        ← provider, detection, duration/number formatting
│   └── locales/*.ts     ← one file per language
├── hooks/
│   ├── useNow.ts        ← 1s ticker aligned to the second
│   └── useTravelState.ts← last action location/time (localStorage)
├── components/          ← Dial, BestSpot, TravelPanel, SpotRow, HowItWorks, AdBanner, StickyAnchorAd, …
├── types/index.ts
├── config.ts            ← env-driven config
└── App.tsx
privacy.html             ← privacy policy (second Vite entry)
scripts/site-pages.ts    ← build plugin: per-hotspot HTML pages, sitemap.xml, robots.txt
```

## AdSense setup

AdSense needs the site on its own domain (ads.txt must be served from the domain root), so connect a custom domain first.

0. **Site URL** — set the repository variable `VITE_SITE_URL` (e.g. `https://pokespot.example.com/`) so canonical links and the sitemap use your domain.
1. **Custom domain** — Settings → Pages → Custom domain, then add the DNS records GitHub shows. The build uses relative paths, so no code change is needed.
2. **Repository variables** — Settings → Secrets and variables → Actions → *Variables*:
   - `VITE_ADSENSE_CLIENT` = `ca-pub-…` (your publisher id)
   - after approval, the ad unit ids: `VITE_AD_SLOT_TOP`, `VITE_AD_SLOT_INFEED`, `VITE_AD_SLOT_ANCHOR` (mobile 300×50), `VITE_AD_SLOT_SIDEBAR` (desktop 300×250), `VITE_AD_INFEED_LAYOUT_KEY`
3. **Redeploy** (push to `main` or run the workflow). With `VITE_ADSENSE_CLIENT` set, the build automatically:
   - adds `<meta name="google-adsense-account">` and the AdSense loader to every page,
   - publishes `/ads.txt` with your publisher line.
4. **Apply in AdSense** with the custom domain. `privacy.html` covers the required cookie/ads disclosures.
5. **Consent** — before serving ads, turn on a Google-certified consent message (AdSense → Privacy & messaging) for EEA/UK/Swiss visitors.

Without `VITE_ADSENSE_CLIENT`, no ad code is loaded and slots render as dashed placeholders.

Notes:
- Exactly one sticky unit is ever mounted: the **300×50** bottom anchor below 768px, the **300×250** sidebar unit from 1024px. Breakpoint-specific units are mounted only when visible (AdSense errors on hidden slots).
- The sticky anchor uses a fixed **300×50** unit, pinned to the bottom edge on mobile only. AdSense allows only **one sticky ad visible at a time**, so don't also enable Auto ads → Anchor ads while this component is in use.
- In-feed units need the `data-ad-layout-key` from your AdSense code snippet.
- PokeSpot doesn't provide or endorse location-changing tools; keep wording that way to stay within Google Publisher Policies.

## Analytics (optional)

Set one repository variable to count page views without cookies: `VITE_CF_ANALYTICS_TOKEN` (Cloudflare Web Analytics) or `VITE_GOATCOUNTER_CODE` (GoatCounter; its hosted free tier is for non-commercial sites).

## Community directory

Listings live in `src/data/communities.ts` and are free. People request one through the **Add a raid community** issue form; review it against the rules in that file, then add the entry.

## Data caveats

- The spot list is what raid players commonly use. Each entry in `src/data/hotspots.ts` cites where its coordinates come from (mostly published community coordinate lists). They are not guarantees of in-game Gym/PokéStop density.
- The cooldown table is unofficial and sources disagree.
- Event times are set by the game operator and can change — check official announcements.

## License

[MIT](LICENSE). Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).
