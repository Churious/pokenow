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
- Mobile-first dark UI, AdSense-ready slots with policy-minded spacing

## Recommendation algorithm

| Tier | Local time | Meaning |
| --- | --- | --- |
| 1 🔥 Golden | 18:00 – 18:59 | Raid Hour (Wed) / Spotlight Hour (Tue) window |
| 2 🟢 Peak | 11:00 – 19:59 (not golden) | General raid activity |
| 3 ⏳ Upcoming | 20:00 – 10:59 | Ranked by time until the next window opens |

Ties inside tiers 1–2 are broken by `popularity` (1–100); tier 3 uses the soonest opening first, then `popularity`. See [`src/lib/scoring.ts`](src/lib/scoring.ts).

**Cooldown / soft-ban mode.** With a last action location and time set, each spot gets `wait = max(0, cooldown(distance) − time since last action)` (capped at 2 h). The tier is evaluated at `now + wait`; a window with under 15 minutes left on arrival doesn't count. Within a tier, shorter waits win (10-minute buckets), then popularity. The state is stored only in the browser's localStorage.

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
├── hooks/
│   ├── useNow.ts        ← 1s ticker aligned to the second
│   └── useTravelState.ts← last action location/time (localStorage)
├── components/          ← Dial, BestSpot, TravelPanel, SpotRow, AdBanner, StickyAnchorAd, …
├── types/index.ts
├── config.ts            ← env-driven config
└── App.tsx
```

## AdSense setup

Copy `.env.example` to `.env.local` and fill in your publisher id and slot ids. Without `VITE_ADSENSE_CLIENT` no ad script is loaded and dashed placeholders are shown.

Notes:
- The sticky anchor uses a fixed **300×50** unit, pinned to the bottom edge on mobile only. AdSense allows only **one sticky ad visible at a time**, so do not also turn on Auto ads → Anchor ads while this component is in use (or remove `<StickyAnchorAd />` and use Auto ads instead).
- In-feed units need the `data-ad-layout-key` from your AdSense code snippet (`VITE_AD_INFEED_LAYOUT_KEY`).
- Review the AdSense Program Policies for your content before applying.

## Data caveats

- Coordinates point at public landmarks/parks, verified against public map data; they are not guarantees of in-game density.
- `popularity` is a community estimate, not measured data.
- The cooldown table is unofficial and sources disagree.
- Event times are set by the game operator and can change — check official announcements.

## License

[MIT](LICENSE). Contributions welcome — see [CONTRIBUTING.md](CONTRIBUTING.md).
