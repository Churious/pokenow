import type { ScoredHotspot } from '../types';
import { formatClock, formatDuration, getUtcOffsetLabel } from '../lib/time';
import { formatCoords } from '../lib/geo';
import { CopyCoordsButton } from './CopyCoordsButton';
import { CrowdGrade, StatusMark } from './StatusBadge';

function timingNote(s: ScoredHotspot): string {
  if (s.plan.waitSeconds > 0) return `Wait ${formatDuration(s.plan.waitSeconds)}`;
  if (s.status === 'raid-hour') return `Ends in ${formatDuration(s.secondsLeftInWindow)}`;
  if (s.status === 'active')
    return s.nextWindow === 'golden'
      ? `Golden hour in ${formatDuration(s.secondsUntilNextWindow)}`
      : `Ends in ${formatDuration(s.secondsLeftInWindow)}`;
  return `Opens in ${formatDuration(s.secondsUntilNextWindow)}`;
}

/** One line of the ranked list. Rank number is real ordering information. */
export function SpotRow({ scored, rank, now }: { scored: ScoredHotspot; rank: number; now: Date }) {
  const { hotspot, clock, status, plan } = scored;
  const timeColor = status === 'raid-hour' ? 'text-gold' : status === 'active' ? 'text-ink' : 'text-faint';

  return (
    <li className="grid grid-cols-[2rem_1fr_auto] gap-x-3 gap-y-2 border-b border-rule py-4">
      <span className="semi-condensed pt-1 text-sm text-faint">{rank}</span>

      <div className="min-w-0">
        <h3 className="condensed truncate text-2xl leading-tight font-extrabold text-ink">{hotspot.city}</h3>
        <p className="truncate text-sm text-dim">{hotspot.spot}</p>
      </div>

      <div className="text-right">
        <p className={`condensed text-2xl leading-tight font-bold ${timeColor}`}>{formatClock(clock)}</p>
        <p className="text-xs text-dim">{getUtcOffsetLabel(now, hotspot.timeZone)}</p>
      </div>

      <div className="col-start-2 col-end-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <StatusMark scored={scored} />
        <span className={plan.waitSeconds > 0 ? 'font-medium text-gold' : 'text-dim'}>{timingNote(scored)}</span>
        {plan.distanceKm !== null && (
          <span className="text-dim">{Math.round(plan.distanceKm).toLocaleString('en-US')} km</span>
        )}
        <CrowdGrade popularity={hotspot.popularity} />
      </div>

      <div className="col-start-2 col-end-4 flex items-center justify-between gap-3">
        <code className="truncate font-sans text-sm text-dim select-all">{formatCoords(hotspot)}</code>
        <CopyCoordsButton hotspot={hotspot} />
      </div>
    </li>
  );
}
