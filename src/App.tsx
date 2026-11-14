/**
 * PokeSpot — main application shell.
 *
 * Two kinds of page share this component:
 *  - Home (`/`): dial + best spot, cooldown panel, ranked list, world map, guides.
 *  - Spot page (`/<hotspot-id>`): one hotspot in depth (see SpotPage).
 * Which one is decided from the URL path (lib/routes.ts); the build emits a
 * static HTML file per hotspot so each page has its own title and description.
 *
 * Ranking logic lives in `lib/scoring.ts`; hotspot data in `data/hotspots.ts`;
 * UI text in `i18n/locales/*`. This file only wires state → components.
 */

import { useEffect, useMemo, useState } from 'react';

import { HOTSPOTS } from './data/hotspots';
import { rankHotspots } from './lib/scoring';
import { currentSpot, homeHref } from './lib/routes';
import { useNow } from './hooks/useNow';
import { useTravelState } from './hooks/useTravelState';
import { CONFIG } from './config';
import { useI18n } from './i18n';
import type { Region } from './types';

import { ToastProvider } from './components/Toast';
import { Logo } from './components/Logo';
import { LanguagePicker } from './components/LanguagePicker';
import { BestSpot } from './components/BestSpot';
import { TravelPanel } from './components/TravelPanel';
import { SpotRow } from './components/SpotRow';
import { SpotPage } from './components/SpotPage';
import { LazyMap } from './components/LazyMap';
import { AdBanner } from './components/AdBanner';
import { StickyAnchorAd } from './components/StickyAnchorAd';
import { CooldownGuide } from './components/CooldownGuide';
import { HowItWorks } from './components/HowItWorks';
import { Footer } from './components/Footer';

type RegionFilter = 'All' | Region;
const FILTERS: RegionFilter[] = ['All', 'Asia-Pacific', 'Europe & Middle East', 'Americas'];

const pad = (n: number) => String(n).padStart(2, '0');

export default function App() {
  const now = useNow();
  const { t } = useI18n();
  const [travel, setTravel] = useTravelState();
  const [region, setRegion] = useState<RegionFilter>('All');
  const [spot] = useState(() => currentSpot());

  // Re-rank every tick; 15–100 spots is far below a millisecond.
  const ranked = useMemo(() => rankHotspots(HOTSPOTS, now, travel), [now, travel]);

  const visible = useMemo(
    () =>
      ranked
        .map((s, i) => ({ scored: s, rank: i + 1 }))
        .filter(({ scored }) => region === 'All' || scored.hotspot.region === region),
    [ranked, region],
  );

  useEffect(() => {
    document.title = spot ? `${spot.city}, ${spot.spot} — PokeSpot` : `PokeSpot — ${t.best.now}`;
  }, [spot, t]);

  return (
    <ToastProvider>
      <header className="border-b border-rule">
        <nav className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4">
          <a href={homeHref} aria-label={t.nav.home}>
            <Logo />
          </a>
          <div className="flex items-center gap-3">
            <p className="hidden text-sm text-dim sm:block">
              <span className="font-semibold text-ink">
                {pad(now.getUTCHours())}:{pad(now.getUTCMinutes())}:{pad(now.getUTCSeconds())}
              </span>{' '}
              {t.nav.utc}
            </p>
            <LanguagePicker />
          </div>
        </nav>
      </header>

      <main className="mx-auto max-w-4xl px-4">
        <AdBanner slot={CONFIG.adsense.slots.top} variant="display" className="mt-4 mb-2" />

        {spot ? (
          <SpotPage spot={spot} ranked={ranked} now={now} />
        ) : (
          <>
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
                  {t.list.title}
                </h2>
                <div role="tablist" aria-label={t.list.regionFilter} className="-mx-1 flex gap-1 overflow-x-auto">
                  {FILTERS.map((f) => {
                    const on = region === f;
                    return (
                      <button
                        key={f}
                        role="tab"
                        aria-selected={on}
                        onClick={() => setRegion(f)}
                        className={`h-9 shrink-0 border-b-2 px-2 text-sm whitespace-nowrap ${
                          on ? 'border-gold font-semibold text-ink' : 'border-transparent text-dim hover:text-ink'
                        }`}
                      >
                        {f === 'All' ? t.list.all : t.list.regions[f]}
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

            <section aria-labelledby="map-title" className="mt-10">
              <h2 id="map-title" className="semi-condensed text-lg font-bold text-ink">
                {t.map.title}
              </h2>
              <p className="mt-1 text-sm text-dim">{t.map.intro}</p>
              <div className="mt-3">
                <LazyMap spots={ranked} bestId={ranked[0]?.hotspot.id} heightClass="h-72 md:h-[26rem]" />
              </div>
            </section>

            <div className="mt-8">
              <HowItWorks />
              <CooldownGuide />
            </div>
          </>
        )}

        <Footer />
      </main>

      <StickyAnchorAd />
    </ToastProvider>
  );
}
