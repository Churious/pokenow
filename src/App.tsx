/**
 * PokeNow — main application shell.
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
import { Map as MapIcon, Plus, Sparkles } from 'lucide-react';

import { HOTSPOTS } from './data/hotspots';
import { rankHotspots } from './lib/scoring';
import { pinFirst } from './lib/favorites';
import { currentSpot, homeHref } from './lib/routes';
import { useNow } from './hooks/useNow';
import { useTravelState } from './hooks/useTravelState';
import { useFavorites } from './hooks/useFavorites';
import { useGoEvents } from './hooks/useGoEvents';
import { useSpotTags } from './hooks/useSpotTags';
import { calendarFrom, eventStatuses } from './lib/schedule';
import { pickTodaySpecialEvent } from './lib/specialEvent';
import { MQ, useMediaQuery } from './hooks/useMediaQuery';
import { CONFIG } from './config';
import { useI18n } from './i18n';
import type { Region } from './types';

import { ToastProvider } from './components/Toast';
import { Logo } from './components/Logo';
import { LanguagePicker } from './components/LanguagePicker';
import { BestSpot } from './components/BestSpot';
import { RoutePlanner } from './components/RoutePlanner';
import { TabBar } from './components/TabBar';
import { ReportLink, ReportProvider } from './components/ReportDialog';
import { EventSchedule } from './components/EventSchedule';
import { TravelPanel } from './components/TravelPanel';
import { SpotRow } from './components/SpotRow';
import { SpotPage } from './components/SpotPage';
import { LazyMap } from './components/LazyMap';
import { AdBanner } from './components/AdBanner';
import { StickyAnchorAd } from './components/StickyAnchorAd';
import { SupportNote } from './components/SupportNote';
import { InstallNote } from './components/InstallNote';
import { CooldownGuide } from './components/CooldownGuide';
import { HowItWorks } from './components/HowItWorks';
import { Footer } from './components/Footer';
import { CommunityList } from './components/CommunityList';

type RegionFilter = 'All' | Region;
const FILTERS: RegionFilter[] = ['All', 'Asia-Pacific', 'Europe & Middle East', 'Americas'];

const pad = (n: number) => String(n).padStart(2, '0');

const HOME_TABS = ['spots', 'route', 'events', 'communities', 'guide'] as const;
type HomeTab = (typeof HOME_TABS)[number];
const tabFromHash = (): HomeTab => {
  const h = window.location.hash.slice(1);
  return (HOME_TABS as readonly string[]).includes(h) ? (h as HomeTab) : 'spots';
};

export default function App() {
  const now = useNow();
  const { t } = useI18n();
  const [travel, setTravel] = useTravelState();
  const { favorites, toggle: toggleFavorite } = useFavorites();
  const [region, setRegion] = useState<RegionFilter>('All');
  const [spot] = useState(() => currentSpot());
  const isLarge = useMediaQuery(MQ.lg);
  const [tab, setTab] = useState<HomeTab>(tabFromHash);
  const [showMapMobile, setShowMapMobile] = useState(() => window.location.hash === '#map');

  // The tab lives in the URL hash (#route, #events, …) so it survives reloads and can be shared.
  const selectTab = (next: HomeTab) => {
    setTab(next);
    history.replaceState(null, '', next === 'spots' ? location.pathname + location.search : `#${next}`);
  };
  useEffect(() => {
    const onHash = () => {
      if (window.location.hash === '#map') {
        setTab('spots');
        setShowMapMobile(true);
      } else {
        setTab(tabFromHash());
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Desktop-only sticky 300×250 unit (the mobile anchor is the sticky unit on phones).
  const sidebarAd = isLarge ? (
    <div className="sticky top-6">
      <AdBanner slot={CONFIG.adsense.slots.sidebar} variant="sidebar" />
    </div>
  ) : null;

  // Event feed: real Raid Hour / Spotlight Hour dates for the labels, plus the Events tab.
  const feed = useGoEvents();
  const feedEvents = feed.status === 'ready' ? feed.events : null;
  const calendar = useMemo(() => (feedEvents ? (calendarFrom(feedEvents) ?? undefined) : undefined), [feedEvents]);
  const visitorZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
    } catch {
      return 'UTC';
    }
  }, []);
  const todaySpecial = useMemo(
    () => (feedEvents ? pickTodaySpecialEvent(eventStatuses(feedEvents, now, visitorZone)) : null),
    [feedEvents, now, visitorZone],
  );
  const { tags, vote: voteTag } = useSpotTags();

  // Re-rank every tick; 15–100 spots is far below a millisecond.
  const ranked = useMemo(() => rankHotspots(HOTSPOTS, now, travel, calendar), [now, travel, calendar]);

  const visible = useMemo(
    () =>
      ranked
        .map((s, i) => ({ scored: s, rank: i + 1 }))
        .filter(({ scored }) => region === 'All' || scored.hotspot.region === region),
    [ranked, region],
  );

  // Pinned spots float to the top of the filtered list; the rank number stays
  // the real (unfiltered) recommendation rank.
  const pinned = useMemo(() => new Set(favorites), [favorites]);
  const ordered = useMemo(
    () => pinFirst(visible, ({ scored }) => scored.hotspot.id, pinned),
    [visible, pinned],
  );

  useEffect(() => {
    document.title = spot ? `${spot.city}, ${spot.spot} — PokeNow` : `PokeNow — ${t.best.now}`;
  }, [spot, t]);

  return (
    <ToastProvider>
      <ReportProvider>
      <header className="border-b border-rule">
        <nav className="mx-auto flex h-14 max-w-4xl items-center justify-between gap-3 px-4 lg:max-w-7xl lg:px-6">
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

      <main className="mx-auto max-w-4xl px-4 lg:max-w-7xl lg:px-6">
        <AdBanner slot={CONFIG.adsense.slots.top} variant="display" className="mt-4 mb-2" />

        {spot ? (
          <SpotPage
            spot={spot}
            ranked={ranked}
            now={now}
            sidebarAd={sidebarAd}
            favorites={pinned}
            onToggleFavorite={toggleFavorite}
            events={feedEvents}
          />
        ) : (
          <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_22rem]">
            {/* Main column */}
            <div className="min-w-0">
              {todaySpecial && (
                <button
                  type="button"
                  onClick={() => selectTab('events')}
                  className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-gold/40 bg-gold/10 px-3 py-1 text-xs font-semibold text-gold hover:border-gold"
                >
                  <Sparkles className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">
                    {todaySpecial.phase === 'live'
                      ? t.livePulse.liveNowBadge(
                          todaySpecial.kind === 'community-day'
                            ? t.schedule.kinds.communityDay
                            : todaySpecial.kind === 'raid-day'
                              ? t.schedule.kinds.raidDay
                              : todaySpecial.name,
                        )
                      : t.livePulse.todayBadge(
                          todaySpecial.kind === 'community-day'
                            ? t.schedule.kinds.communityDay
                            : todaySpecial.kind === 'raid-day'
                              ? t.schedule.kinds.raidDay
                              : todaySpecial.name,
                        )}
                  </span>
                </button>
              )}
              <BestSpot ranked={ranked} now={now} travel={travel} tags={tags} onVoteTag={voteTag} />

              {/* On desktop the cooldown panel lives in the sidebar. */}
              <TravelPanel hotspots={HOTSPOTS} travel={travel} onChange={setTravel} now={now} className="lg:hidden" />

              <TabBar
                label={t.tabs.label}
                active={tab}
                onChange={selectTab}
                tabs={[
                  { key: 'spots', label: t.tabs.spots },
                  { key: 'route', label: t.tabs.route },
                  { key: 'events', label: t.tabs.events },
                  { key: 'communities', label: t.tabs.communities },
                  { key: 'guide', label: t.tabs.guide },
                ]}
              />

              <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="pt-6">
                {tab === 'spots' && (
                  <>
                    <section aria-labelledby="all-spots-title">
                      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-rule pb-3">
                        <div className="min-w-0">
                          <h2 id="all-spots-title" className="semi-condensed text-lg font-bold text-ink">
                            {t.list.title}
                          </h2>
                          {favorites.length > 0 && <p className="mt-1 text-xs text-faint">{t.favorites.hint}</p>}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                          <div role="group" aria-label={t.list.regionFilter} className="flex gap-2 overflow-x-auto p-px">
                            {FILTERS.map((f) => {
                              const on = region === f;
                              return (
                                <button
                                  key={f}
                                  type="button"
                                  aria-pressed={on}
                                  onClick={() => setRegion(f)}
                                  className={`h-9 shrink-0 rounded-full px-3 text-sm whitespace-nowrap ${
                                    on ? 'bg-ink font-semibold text-night' : 'text-dim ring-1 ring-rule hover:text-ink'
                                  }`}
                                >
                                  {f === 'All' ? t.list.all : t.list.regions[f]}
                                </button>
                              );
                            })}
                          </div>
                          <button
                            type="button"
                            aria-pressed={showMapMobile}
                            onClick={() => setShowMapMobile((v) => !v)}
                            className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-sm whitespace-nowrap lg:hidden ${
                              showMapMobile ? 'bg-ink font-semibold text-night' : 'text-dim ring-1 ring-rule hover:text-ink'
                            }`}
                          >
                            <MapIcon className="size-3.5" aria-hidden />
                            {t.map.title}
                          </button>
                          <ReportLink
                            kind="hotspot"
                            className="inline-flex h-9 items-center gap-1.5 text-sm font-medium whitespace-nowrap text-dim underline underline-offset-4 hover:text-ink"
                          >
                            <Plus className="size-4" aria-hidden />
                            {t.list.suggest}
                          </ReportLink>
                        </div>
                      </div>

                      {showMapMobile && !isLarge && (
                        <div className="mt-4">
                          <LazyMap spots={ranked} bestId={ranked[0]?.hotspot.id} heightClass="h-80 md:h-96" />
                        </div>
                      )}

                      <ul className="md:grid md:grid-cols-2 md:gap-x-10 xl:grid-cols-[1.25rem_minmax(8rem,1fr)_auto_minmax(11rem,1.2fr)_auto] xl:gap-x-5">
                        {ordered.slice(0, 4).map(({ scored, rank }) => (
                          <SpotRow
                            key={scored.hotspot.id}
                            scored={scored}
                            rank={rank}
                            now={now}
                            pinned={pinned.has(scored.hotspot.id)}
                            onToggleFavorite={toggleFavorite}
                            tagEntries={tags[scored.hotspot.id]}
                            onVoteTag={voteTag}
                          />
                        ))}
                      </ul>

                      <AdBanner
                        slot={CONFIG.adsense.slots.inFeed}
                        variant="in-feed"
                        layoutKey={CONFIG.adsense.inFeedLayoutKey}
                        className="my-6"
                      />

                      {ordered.length > 4 && (
                        <ul className="md:grid md:grid-cols-2 md:gap-x-10 xl:grid-cols-[1.25rem_minmax(8rem,1fr)_auto_minmax(11rem,1.2fr)_auto] xl:gap-x-5">
                          {ordered.slice(4).map(({ scored, rank }) => (
                            <SpotRow
                              key={scored.hotspot.id}
                              scored={scored}
                              rank={rank}
                              now={now}
                              pinned={pinned.has(scored.hotspot.id)}
                              onToggleFavorite={toggleFavorite}
                            />
                          ))}
                        </ul>
                      )}
                    </section>
                  </>
                )}

                {tab === 'route' && (
                  <div className="space-y-10">
                    <RoutePlanner ranked={ranked} now={now} travel={travel} calendar={calendar} />
                    <AdBanner
                      slot={CONFIG.adsense.slots.inFeed}
                      variant="in-feed"
                      layoutKey={CONFIG.adsense.inFeedLayoutKey}
                    />
                    <CooldownGuide />
                  </div>
                )}

                {tab === 'events' && (
                  <>
                    <EventSchedule now={now} feed={feed} />
                    <AdBanner
                      slot={CONFIG.adsense.slots.inFeed}
                      variant="in-feed"
                      layoutKey={CONFIG.adsense.inFeedLayoutKey}
                      className="mt-8"
                    />
                  </>
                )}

                {tab === 'communities' && (
                  <>
                    <CommunityList hotspotId={null} showAll />
                    <AdBanner
                      slot={CONFIG.adsense.slots.inFeed}
                      variant="in-feed"
                      layoutKey={CONFIG.adsense.inFeedLayoutKey}
                      className="mt-8"
                    />
                  </>
                )}

                {tab === 'guide' && (
                  <div className="lg:grid lg:grid-cols-2 lg:gap-10">
                    <HowItWorks />
                    <div className="mt-8 lg:mt-0 lg:pt-2">
                      <CooldownGuide />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Desktop sidebar */}
            {isLarge && (
              <aside className="flex flex-col gap-8 pt-6">
                <TravelPanel hotspots={HOTSPOTS} travel={travel} onChange={setTravel} now={now} className="border-t-0 pt-0" />
                <section aria-labelledby="side-map-title">
                  <h2 id="side-map-title" className="semi-condensed text-lg font-bold text-ink">
                    {t.map.title}
                  </h2>
                  <p className="mt-1 text-sm text-dim">{t.map.intro}</p>
                  <div className="mt-3">
                    <LazyMap spots={ranked} bestId={ranked[0]?.hotspot.id} heightClass="h-64" />
                  </div>
                </section>
                <CommunityList hotspotId={null} compact maxItems={3} onViewAll={() => selectTab('communities')} />
                {sidebarAd}
              </aside>
            )}
          </div>
        )}

        <Footer />
      </main>

      <StickyAnchorAd />
      <SupportNote />
      <InstallNote />
      </ReportProvider>
    </ToastProvider>
  );
}
