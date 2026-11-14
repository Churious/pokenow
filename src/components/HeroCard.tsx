import { Flame, Hourglass, MapPin, Sparkles } from 'lucide-react';
import type { ScoredHotspot } from '../types';
import { formatClock, formatDuration, formatWeekday, getUtcOffsetLabel } from '../lib/time';
import { formatCoords } from '../lib/geo';
import { CopyCoordsButton } from './CopyCoordsButton';
import { DensityChip, StatusBadge } from './StatusBadge';

const TIER_COPY = {
  golden: { kicker: 'Tier 1 · Golden Time', Icon: Flame },
  peak: { kicker: 'Tier 2 · Peak Raid Window', Icon: Sparkles },
  upcoming: { kicker: 'Tier 3 · Upcoming Prime', Icon: Hourglass },
} as const;

/** Big "Best Raid Spot Now" card at the top of the page. */
export function HeroCard({ scored, now }: { scored: ScoredHotspot; now: Date }) {
  const { hotspot, clock, tier } = scored;
  const { kicker, Icon } = TIER_COPY[tier];
  const golden = tier === 'golden';

  const timing =
    tier === 'upcoming'
      ? `${scored.nextWindow === 'golden' ? 'Golden Time' : 'Peak window'} starts in ${formatDuration(scored.secondsUntilNextWindow)}`
      : golden
        ? `${scored.eventLabel} ends in ${formatDuration(scored.secondsLeftInWindow)}`
        : scored.nextWindow === 'golden'
          ? `Golden Time in ${formatDuration(scored.secondsUntilNextWindow)}`
          : `Peak window ends in ${formatDuration(scored.secondsLeftInWindow)}`;

  return (
    <section
      aria-labelledby="hero-title"
      className={`relative overflow-hidden rounded-3xl border p-5 sm:p-7 ${
        golden
          ? 'border-raid/40 bg-gradient-to-br from-raid/20 via-panel to-panel'
          : 'border-go/30 bg-gradient-to-br from-go/15 via-panel to-panel'
      }`}
    >
      {/* decorative radar rings */}
      <div
        aria-hidden
        className={`pointer-events-none absolute -top-16 -right-16 size-56 rounded-full border-2 ${golden ? 'border-raid/20' : 'border-go/15'}`}
      />
      <div
        aria-hidden
        className={`pointer-events-none absolute -top-4 -right-4 size-32 rounded-full border-2 ${golden ? 'border-raid/25' : 'border-go/20'}`}
      />

      <p className="flex items-center gap-2 text-xs font-bold tracking-[0.18em] text-slate-400 uppercase">
        <Icon className={`size-4 ${golden ? 'text-raid' : 'text-go'}`} aria-hidden />
        Best Raid Spot Now
      </p>

      <h1 id="hero-title" className="mt-3 text-3xl leading-tight font-extrabold text-white sm:text-4xl">
        {hotspot.city}
        <span className="block text-lg font-semibold text-slate-300 sm:text-xl">{hotspot.spot}</span>
      </h1>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge scored={scored} />
        <DensityChip popularity={hotspot.popularity} />
        <span className="text-xs text-slate-500">{kicker}</span>
      </div>

      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-slate-500">
            Local time · {formatWeekday(clock)} · {getUtcOffsetLabel(now, hotspot.timeZone)}
          </p>
          <p
            className={`tabular font-mono text-4xl font-bold sm:text-5xl ${golden ? 'text-amber-300' : 'text-white'}`}
          >
            {formatClock(clock)}
          </p>
        </div>
      </div>

      <p className={`mt-2 text-sm font-medium ${golden ? 'text-amber-200' : 'text-emerald-200'}`}>{timing}</p>

      {hotspot.note && <p className="mt-3 text-sm text-slate-400">{hotspot.note}</p>}

      <div className="mt-5 flex flex-col gap-3 rounded-2xl bg-night/60 p-3 ring-1 ring-line sm:flex-row sm:items-center sm:justify-between">
        <p className="flex min-w-0 items-center gap-2">
          <MapPin className="size-4 shrink-0 text-go" aria-hidden />
          <code className="tabular truncate font-mono text-base text-slate-100 select-all">{formatCoords(hotspot)}</code>
        </p>
        <CopyCoordsButton hotspot={hotspot} size="lg" />
      </div>
    </section>
  );
}
