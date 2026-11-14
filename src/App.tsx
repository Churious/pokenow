/**
 * PokeSpot — main application shell.
 *
 * Layout (mobile-first, top → bottom):
 *   1. Nav (logo + live UTC clock)
 *   2. [Ad] responsive display banner
 *   3. Recommendation: 24-hour dial + best spot
 *   4. Your cooldown (free / cooling down / soft-banned)
 *   5. [Ad] native in-feed slot
 *   6. Ranked list of every hotspot, filterable by region
 *   7. Cooldown reference (collapsible)
 *   8. Footer (disclaimer + GitHub)
 *   9. [Ad] sticky bottom anchor (mobile only, closable)
 *
 * Ranking logic lives in `lib/scoring.ts`; hotspot data in `data/hotspots.ts`.
 * This file only wires state → components.
 */

import { useMemo, useState } from 'react';

import { HOTSPOTS } from './data/hotspots';
import { rankHotspots } from './lib/scoring';
import { useNow } from './hooks/useNow';
import { useTravelState } from './hooks/useTravelState';
import { CONFIG } from './config';
import type { Region } from './types';

import { ToastProvider } from './components/Toast';
import { Logo } from './components/Logo';
import { BestSpot } from './components/BestSpot';
import { TravelPanel } from './components/TravelPanel';
import { SpotRow } from './components/SpotRow';
import { AdBanner } from './components/AdBanner';
import { StickyAnchorAd } from './components/StickyAnchorAd';
import { CooldownGuide } from './components/CooldownGuide';
import { Footer } from './components/Footer';

type RegionFilter = 'All' | Region;
const FILTERS: { value: RegionFilter; label: string }[] = [
  { value: 'All', label: 'All' },
  { value: 'Asia-Pacific', label: 'Asia-Pacific' },
  { value: 'Europe & Middle East', label: 'Europe & Middle East' },
  { value: 'Americas', label: 'Americas' },
];

const pad = (n: number) => String(n).padStart(2, '0');

export default function App() {
  const now = useNow();
  const [travel, setTravel] = useTravelState();
  const [region, setRegion] = useState<RegionFilter>('All');

  // Re-rank every tick; 15–100 spots is far below a millisecond.
  const ranked = useMemo(() => rankHotspots(HOTSPOTS, now, travel), [now, travel]);

  const visible = useMemo(
    () =>
      ranked
        .map((s, i) => ({ scored: s, rank: i + 1 }))
        .filter(({ scored }) => region === 'All' || scored.hotspot.region === region),
    [ranked, region],
  );

  return (
    <ToastProvider>
      <header className="border-b border-rule">
        <nav className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <a href={import.meta.env.BASE_URL} aria-label="PokeSpot home">
            <Logo />
          </a>
          <p className="text-sm text-dim">
            <span className="font-semibold text-ink">
              {pad(now.getUTCHours())}:{pad(now.getUTCMinutes())}:{pad(now.getUTCSeconds())}
            </span>{' '}
            UTC
          </p>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-4">
        <AdBanner slot={CONFIG.adsense.slots.top} variant="display" className="mt-4 mb-2" />

        <BestSpot ranked={ranked} now={now} travel={travel} />

        <TravelPanel hotspots={HOTSPOTS} travel={travel} onChange={setTravel} now={now} />

        <AdBanner
          slot={CONFIG.adsense.slots.inFeed}
          variant="in-feed"
          layoutKey={CONFIG.adsense.inFeedLayoutKey}
          className="my-8"
        />

        <section aria-labelledby="all-spots-title">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-rule pb-3">
            <h2 id="all-spots-title" className="semi-condensed text-lg font-bold text-ink">
              Every hotspot, best first
            </h2>
            <div role="tablist" aria-label="Filter by region" className="-mx-1 flex gap-1 overflow-x-auto">
              {FILTERS.map((f) => {
                const on = region === f.value;
                return (
                  <button
                    key={f.value}
                    role="tab"
                    aria-selected={on}
                    onClick={() => setRegion(f.value)}
                    className={`h-9 shrink-0 border-b-2 px-2 text-sm whitespace-nowrap ${
                      on ? 'border-gold font-semibold text-ink' : 'border-transparent text-dim hover:text-ink'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>

          <ul className="md:grid md:grid-cols-2 md:gap-x-10">
            {visible.map(({ scored, rank }) => (
              <SpotRow key={scored.hotspot.id} scored={scored} rank={rank} now={now} />
            ))}
          </ul>
        </section>

        <div className="mt-8">
          <CooldownGuide />
        </div>

        <Footer />
      </main>

      <StickyAnchorAd />
    </ToastProvider>
  );
}
