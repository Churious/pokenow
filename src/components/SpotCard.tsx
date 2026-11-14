import type { ScoredHotspot } from '../types';
import { formatClock, formatDuration, formatWeekday, getUtcOffsetLabel } from '../lib/time';
import { formatCoords } from '../lib/geo';
import { CopyCoordsButton } from './CopyCoordsButton';
import { DensityChip, StatusBadge } from './StatusBadge';

/** Converts "JP" → 🇯🇵 using regional indicator symbols. */
function flag(countryCode: string): string {
  return countryCode
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65));
}

/** One row in the "All Global Spots" list. */
export function SpotCard({ scored, rank, now }: { scored: ScoredHotspot; rank: number; now: Date }) {
  const { hotspot, clock, status } = scored;

  const sub =
    status === 'raid-hour'
      ? `ends in ${formatDuration(scored.secondsLeftInWindow)}`
      : status === 'active'
        ? scored.nextWindow === 'golden'
          ? `golden in ${formatDuration(scored.secondsUntilNextWindow)}`
          : `ends in ${formatDuration(scored.secondsLeftInWindow)}`
        : `opens in ${formatDuration(scored.secondsUntilNextWindow)}`;

  return (
    <li
      className={`rounded-2xl border bg-panel p-4 transition ${
        status === 'raid-hour' ? 'border-raid/40' : status === 'active' ? 'border-go/25' : 'border-line opacity-80'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-xs text-slate-500">
            <span className="tabular font-mono">#{rank}</span>
            <span aria-hidden>{flag(hotspot.countryCode)}</span>
            <span>{hotspot.region}</span>
          </p>
          <h3 className="mt-0.5 truncate text-lg font-bold text-white">{hotspot.city}</h3>
          <p className="truncate text-sm text-slate-400">{hotspot.spot}</p>
        </div>
        <div className="text-right">
          <p
            className={`tabular font-mono text-xl font-bold ${status === 'raid-hour' ? 'text-amber-300' : status === 'active' ? 'text-emerald-300' : 'text-slate-400'}`}
          >
            {formatClock(clock)}
          </p>
          <p className="text-xs text-slate-500">
            {formatWeekday(clock)} · {getUtcOffsetLabel(now, hotspot.timeZone)}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <StatusBadge scored={scored} />
        <DensityChip popularity={hotspot.popularity} />
        <span className="tabular text-xs text-slate-500">{sub}</span>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 border-t border-line pt-3">
        <code className="tabular min-w-0 truncate font-mono text-sm text-slate-300 select-all">
          {formatCoords(hotspot)}
        </code>
        <CopyCoordsButton hotspot={hotspot} />
      </div>
    </li>
  );
}
