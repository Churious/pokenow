import type { ReactNode } from 'react';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import type { Hotspot, ScoredHotspot } from '../types';
import { formatClock, getUtcOffsetLabel } from '../lib/time';
import { formatCoords } from '../lib/geo';
import { nextGoldenWindow, type EventTiming } from '../lib/events';
import { homeHref, spotHref } from '../lib/routes';
import { useI18n } from '../i18n';
import { campfireHref } from '../lib/platform';
import { CopyCoordsButton } from './CopyCoordsButton';
import { FavoriteButton } from './FavoriteButton';
import { StatusMark } from './StatusBadge';
import { LazyMap } from './LazyMap';
import { CommunityList } from './CommunityList';

/** Dedicated page for one hotspot: live clock, upcoming events, coordinates, map. */
export function SpotPage({
  spot,
  ranked,
  now,
  sidebarAd,
  favorites,
  onToggleFavorite,
}: {
  spot: Hotspot;
  ranked: ScoredHotspot[];
  now: Date;
  /** Desktop-only sticky ad, rendered at the bottom of the sidebar. */
  sidebarAd?: ReactNode;
  favorites: ReadonlySet<string>;
  onToggleFavorite: (id: string) => void;
}) {
  const { t, dur, weekday } = useI18n();
  const scored = ranked.find((s) => s.hotspot.id === spot.id);
  if (!scored) return null;
  const { clock } = scored;

  const events: { label: string; timing: EventTiming; gold: boolean }[] = [
    { label: t.city.nextGolden, timing: nextGoldenWindow(clock, null), gold: false },
    { label: t.city.nextRaidHour, timing: nextGoldenWindow(clock, 3), gold: true },
    { label: t.city.nextSpotlight, timing: nextGoldenWindow(clock, 2), gold: true },
  ];

  const others = ranked.filter((s) => s.hotspot.id !== spot.id).slice(0, 5);
  const coords = `${spot.lat},${spot.lng}`;

  return (
    <article className="py-6 lg:grid lg:grid-cols-[minmax(0,1fr)_24rem] lg:gap-10 xl:grid-cols-[minmax(0,1fr)_28rem]">
      <div className="min-w-0">
      <a href={homeHref} className="inline-flex h-10 items-center gap-1.5 text-sm text-dim hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        {t.city.back}
      </a>

      <header className="mt-4">
        <h1 className="condensed text-6xl leading-[0.9] font-black text-ink sm:text-7xl">{spot.city}</h1>
        <p className="semi-condensed mt-2 text-xl font-medium text-dim">{spot.spot}</p>
        <p className="mt-3 max-w-prose text-sm text-dim">{t.city.seoIntro(spot.city, spot.spot)}</p>
      </header>

      <section className="mt-6 grid gap-6 md:grid-cols-2 lg:gap-10">
        <div>
          <p className="text-sm text-dim">{t.city.localTime}</p>
          <div className="flex flex-wrap items-baseline gap-x-3">
            <span className={`condensed text-6xl font-bold ${scored.tier === 'golden' ? 'text-gold' : 'text-ink'}`}>
              {formatClock(clock)}
            </span>
            <span className="text-sm text-dim">
              {weekday(now, spot.timeZone)}, {getUtcOffsetLabel(now, spot.timeZone)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <StatusMark scored={scored} />
          </div>
          {spot.note && <p className="mt-3 text-sm text-dim">{spot.note}</p>}

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <code className="font-sans text-lg font-semibold text-ink select-all">{formatCoords(spot)}</code>
            <CopyCoordsButton hotspot={spot} tone="primary" />
            <FavoriteButton
              hotspotId={spot.id}
              pinned={favorites.has(spot.id)}
              onToggle={onToggleFavorite}
              withLabel
            />
          </div>
        </div>

        <dl className="divide-y divide-rule border-y border-rule">
          {events.map((e) => (
            <div key={e.label} className="flex items-baseline justify-between gap-4 py-3">
              <dt className="text-sm text-dim">{e.label}</dt>
              <dd
                className={`condensed text-2xl font-bold whitespace-nowrap ${
                  e.timing.live ? 'text-gold' : e.gold ? 'text-ink' : 'text-ink'
                }`}
              >
                {e.timing.live ? t.city.liveNow : t.city.inDuration(dur(e.timing.secondsUntil))}
              </dd>
            </div>
          ))}
        </dl>
      </section>


      <section aria-labelledby="others-title" className="mt-10">
        <h2 id="others-title" className="semi-condensed text-lg font-bold text-ink">
          {t.city.otherSpots}
        </h2>
        <ul className="mt-3 divide-y divide-rule border-y border-rule">
          {others.map((o) => (
            <li key={o.hotspot.id} className="flex items-center justify-between gap-3 py-3">
              <a href={spotHref(o.hotspot.id)} className="min-w-0 hover:underline hover:underline-offset-4">
                <span className="condensed block truncate text-xl font-extrabold text-ink">{o.hotspot.city}</span>
                <span className="block truncate text-sm text-dim">{o.hotspot.spot}</span>
              </a>
              <div className="shrink-0 text-right text-sm">
                <StatusMark scored={o} />
                <p className="condensed text-lg font-bold text-ink">{formatClock(o.clock)}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>
        <div className="mt-10">
          <CommunityList hotspotId={spot.id} />
        </div>
      </div>

      <aside className="flex flex-col gap-8 lg:pt-14">
        <section aria-labelledby="map-title" className="mt-10 lg:mt-0">
          <h2 id="map-title" className="semi-condensed text-lg font-bold text-ink">
            {t.city.mapTitle}
          </h2>
          <div className="mt-3">
            <LazyMap spots={ranked} focusId={spot.id} heightClass="h-72 md:h-96 lg:h-[28rem]" />
          </div>
          <p className="mt-2 text-xs text-faint">{t.city.mapNote}</p>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${coords}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-ink underline underline-offset-4"
            >
              {t.city.openGoogle}
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
            <a
              href={`https://www.openstreetmap.org/?mlat=${spot.lat}&mlon=${spot.lng}#map=17/${spot.lat}/${spot.lng}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-ink underline underline-offset-4"
            >
              {t.city.openOsm}
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
            {/* Official app: App Store on iOS, Google Play on Android, website elsewhere. Plain text, no branding. */}
            <a
              href={campfireHref()}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-ink underline underline-offset-4"
            >
              {t.city.openCampfire}
              <ExternalLink className="size-3.5" aria-hidden />
            </a>
          </div>
        </section>
        {sidebarAd}
      </aside>
    </article>
  );
}
