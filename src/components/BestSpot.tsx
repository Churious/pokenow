import type { ScoredHotspot, TravelState } from '../types';
import { formatClock, formatDuration, formatWeekday, getUtcOffsetLabel } from '../lib/time';
import { formatCoords } from '../lib/geo';
import { CopyCoordsButton } from './CopyCoordsButton';
import { CrowdGrade, StatusMark } from './StatusBadge';
import { Dial } from './Dial';

function arrivalSentence(s: ScoredHotspot): string {
  const { plan } = s;
  if (plan.waitSeconds > 0) {
    const wait = formatDuration(plan.waitSeconds);
    if (plan.arrivalTier === 'golden') return `Safe to play here in ${wait}, during ${plan.arrivalEventLabel ?? 'golden hour'}.`;
    if (plan.arrivalTier === 'peak') return `Safe to play here in ${wait}, inside the peak window.`;
    return `Safe to play here in ${wait}. The next raid window opens in ${formatDuration(plan.secondsUntilUsable)}.`;
  }
  if (s.tier === 'golden') return `${s.eventLabel === 'Golden Time' ? 'Golden hour' : s.eventLabel} ends in ${formatDuration(s.secondsLeftInWindow)}.`;
  if (s.tier === 'peak')
    return s.nextWindow === 'golden'
      ? `Peak window now. Golden hour starts in ${formatDuration(s.secondsUntilNextWindow)}.`
      : `Peak window ends in ${formatDuration(s.secondsLeftInWindow)}.`;
  return `Every spot is quiet. This one opens first, in ${formatDuration(s.plan.secondsUntilUsable)}.`;
}

/** The recommendation: the 24-hour dial plus the best spot's details. */
export function BestSpot({
  ranked,
  now,
  travel,
}: {
  ranked: ScoredHotspot[];
  now: Date;
  travel: TravelState;
}) {
  const best = ranked[0];
  if (!best) return null;
  const { hotspot, clock } = best;

  return (
    <section aria-labelledby="best-title" className="grid items-center gap-6 py-6 md:grid-cols-[340px_1fr] md:gap-10">
      <div className="mx-auto w-full max-w-[340px] rounded-full bg-deck p-2">
        <Dial ranked={ranked} bestId={hotspot.id} />
      </div>

      <div>
        <p className="text-sm text-dim">
          {travel.mode === 'free' ? 'Best raid spot right now' : `Best raid spot from ${travel.origin.label}`}
        </p>
        <h1 id="best-title" className="condensed mt-1 text-6xl leading-[0.9] font-black text-ink sm:text-7xl">
          {hotspot.city}
        </h1>
        <p className="semi-condensed mt-2 text-xl font-medium text-dim">{hotspot.spot}</p>

        <div className="mt-5 flex items-baseline gap-3">
          <span className={`condensed text-5xl font-bold ${best.tier === 'golden' ? 'text-gold' : 'text-ink'}`}>
            {formatClock(clock)}
          </span>
          <span className="text-sm text-dim">
            {formatWeekday(clock)}, {getUtcOffsetLabel(now, hotspot.timeZone)}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <StatusMark scored={best} />
          <CrowdGrade popularity={hotspot.popularity} />
          {best.plan.distanceKm !== null && (
            <span className="text-dim">{Math.round(best.plan.distanceKm).toLocaleString('en-US')} km away</span>
          )}
        </div>

        <p className="mt-3 max-w-prose text-ink">{arrivalSentence(best)}</p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <code className="font-sans text-lg font-semibold text-ink select-all">{formatCoords(hotspot)}</code>
          <CopyCoordsButton hotspot={hotspot} tone="primary" />
        </div>
      </div>
    </section>
  );
}
