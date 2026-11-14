/**
 * PokeSpot — main application shell.
 *
 * Layout (mobile-first, top → bottom):
 *   1. Sticky nav (logo + live UTC clock)
 *   2. [Ad] responsive display banner
 *   3. Hero: "Best Raid Spot Now"
 *   4. [Ad] native in-feed slot
 *   5. "All Global Spots" list with region filter
 *   6. Cooldown Reference Guide (accordion)
 *   7. Footer (disclaimer + GitHub)
 *   8. [Ad] sticky bottom anchor (mobile only, closable)
 *
 * All recommendation logic lives in `lib/scoring.ts`; all data lives in
 * `data/hotspots.ts`. This file only wires state → components.
 */

import { useMemo, useState } from 'react';
import { Globe2 } from 'lucide-react';

import { HOTSPOTS } from './data/hotspots';
import { rankHotspots } from './lib/scoring';
import { formatUtc } from './lib/time';
import { useNow } from './hooks/useNow';
import { CONFIG } from './config';
import type { Region } from './types';

import { ToastProvider } from './components/Toast';
import { Logo } from './components/Logo';
import { HeroCard } from './components/HeroCard';
import { SpotCard } from './components/SpotCard';
import { AdBanner } from './components/AdBanner';
import { StickyAnchorAd } from './components/StickyAnchorAd';
import { CooldownGuide } from './components/CooldownGuide';
import { Footer } from './components/Footer';

type RegionFilter = 'All' | Region;
const FILTERS: RegionFilter[] = ['All', 'Asia-Pacific', 'Europe & Middle East', 'Americas'];

export default function App() {
  const now = useNow();
  const [region, setRegion] = useState<RegionFilter>('All');

  // Re-rank every tick. 15–100 spots × 1 Intl call each is well under 1ms.
  const ranked = useMemo(() => rankHotspots(HOTSPOTS, now), [now]);
  const best = ranked[0];

  const visible = useMemo(
    () =>
      ranked
        .map((s, i) => ({ scored: s, rank: i + 1 }))
        .filter(({ scored }) => region === 'All' || scored.hotspot.region === region),
    [ranked, region],
  );

  const counts = useMemo(
    () => ({
      golden: ranked.filter((s) => s.tier === 'golden').length,
      peak: ranked.filter((s) => s.tier === 'peak').length,
    }),
    [ranked],
  );

  return (
    <ToastProvider>
      {/* 1. Navigation */}
      <header className="sticky top-0 z-40 border-b border-line bg-night/85 backdrop-blur">
        <nav className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4">
          <a href="/" aria-label="PokeSpot home">
            <Logo />
          </a>
          <p className="tabular flex items-center gap-1.5 font-mono text-xs text-slate-400">
            <Globe2 className="size-3.5" aria-hidden />
            {formatUtc(now)}
          </p>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-4">
        {/* 2. Top display banner — generous spacing keeps it clear of the nav and hero buttons. */}
        <AdBanner slot={CONFIG.adsense.slots.top} variant="display" className="my-5" />

        {/* 3. Hero */}
        {best && <HeroCard scored={best} now={now} />}

        <p className="mt-3 text-center text-xs text-slate-500">
          🔥 {counts.golden} in Golden Time · 🟢 {counts.peak} in Peak Window · {HOTSPOTS.length} hotspots tracked
        </p>

        {/* 4. In-feed native slot between hero and list (my-8 = safe tap distance from both). */}
        <AdBanner
          slot={CONFIG.adsense.slots.inFeed}
          variant="in-feed"
          layoutKey={CONFIG.adsense.inFeedLayoutKey}
          className="my-8"
        />

        {/* 5. All spots */}
        <section aria-labelledby="all-spots-title">
          <div className="mb-3 flex items-end justify-between gap-3">
            <h2 id="all-spots-title" className="text-xl font-bold text-white">
              All Global Spots
            </h2>
            <span className="text-xs text-slate-500">ranked live</span>
          </div>

          <div role="tablist" aria-label="Filter by region" className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">
            {FILTERS.map((f) => (
              <button
                key={f}
                role="tab"
                aria-selected={region === f}
                onClick={() => setRegion(f)}
                className={`h-9 shrink-0 rounded-full px-4 text-sm font-medium transition ${
                  region === f
                    ? 'bg-go text-night'
                    : 'bg-panel text-slate-300 ring-1 ring-line hover:bg-panel-2'
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {visible.map(({ scored, rank }) => (
              <SpotCard key={scored.hotspot.id} scored={scored} rank={rank} now={now} />
            ))}
          </ul>
        </section>

        {/* 6. Cooldown guide */}
        <div className="mt-8">
          <CooldownGuide hotspots={HOTSPOTS} />
        </div>

        {/* 7. Footer */}
        <Footer />
      </main>

      {/* 8. Mobile sticky anchor */}
      <StickyAnchorAd />
    </ToastProvider>
  );
}
