import type { ScoredHotspot, TravelState } from '../types';
import { formatClock, getUtcOffsetLabel } from '../lib/time';
import { formatCoords } from '../lib/geo';
import { spotHref } from '../lib/routes';
import { useI18n } from '../i18n';
import type { Messages } from '../i18n/types';
import { CopyCoordsButton } from './CopyCoordsButton';
import { CrowdGrade, StatusMark, eventName } from './StatusBadge';
import { Dial } from './Dial';

function arrivalSentence(s: ScoredHotspot, t: Messages, dur: (n: number) => string): string {
  const { plan } = s;
  if (plan.waitSeconds > 0) {
    const wait = dur(plan.waitSeconds);
    if (plan.arrivalTier === 'golden') return t.best.readyGolden(wait, eventName(t, plan.arrivalEventLabel));
    if (plan.arrivalTier === 'peak') return t.best.readyPeak(wait);
    return t.best.readyUpcoming(wait, dur(plan.secondsUntilUsable));
  }
  if (s.tier === 'golden') return t.best.endsIn(eventName(t, s.eventLabel), dur(s.secondsLeftInWindow));
  if (s.tier === 'peak')
    return s.nextWindow === 'golden'
      ? t.best.peakThenGolden(dur(s.secondsUntilNextWindow))
      : t.best.peakEndsIn(dur(s.secondsLeftInWindow));
  return t.best.allQuiet(dur(s.plan.secondsUntilUsable));
}

/** The recommendation: the 24-hour dial plus the best spot's details. */
export function BestSpot({ ranked, now, travel }: { ranked: ScoredHotspot[]; now: Date; travel: TravelState }) {
  const { t, dur, num, weekday } = useI18n();
  const best = ranked[0];
  if (!best) return null;
  const { hotspot, clock } = best;
  const origin =
    travel.mode === 'free'
      ? null
      : travel.origin.label === 'your last spot'
        ? t.travel.yourLastSpot
        : travel.origin.label;

  return (
    <section aria-labelledby="best-title" className="grid items-center gap-6 py-6 md:grid-cols-[340px_1fr] md:gap-10 xl:grid-cols-[380px_1fr] xl:py-10">
      <div className="mx-auto w-full max-w-[340px] rounded-full bg-deck p-2 xl:max-w-[380px]">
        <Dial ranked={ranked} bestId={hotspot.id} label={t.best.dialLabel} />
      </div>

      <div>
        <p className="text-sm text-dim">{origin ? t.best.from(origin) : t.best.now}</p>
        <h1 id="best-title" className="condensed mt-1 text-6xl leading-[0.9] font-black text-ink sm:text-7xl xl:text-8xl">
          <a href={spotHref(hotspot.id)} className="hover:underline hover:decoration-2 hover:underline-offset-8">
            {hotspot.city}
          </a>
        </h1>
        <p className="semi-condensed mt-2 text-xl font-medium text-dim">{hotspot.spot}</p>

        <div className="mt-5 flex flex-wrap items-baseline gap-x-3">
          <span className={`condensed text-5xl font-bold ${best.tier === 'golden' ? 'text-gold' : 'text-ink'}`}>
            {formatClock(clock)}
          </span>
          <span className="text-sm text-dim">
            {weekday(now, hotspot.timeZone)}, {getUtcOffsetLabel(now, hotspot.timeZone)}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <StatusMark scored={best} />
          <CrowdGrade popularity={hotspot.popularity} />
          {best.plan.distanceKm !== null && (
            <span className="text-dim">{t.best.kmAway(num(best.plan.distanceKm))}</span>
          )}
        </div>

        <p className="mt-3 max-w-prose text-ink">{arrivalSentence(best, t, dur)}</p>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <code className="font-sans text-lg font-semibold text-ink select-all">{formatCoords(hotspot)}</code>
          <CopyCoordsButton hotspot={hotspot} tone="primary" />
        </div>
      </div>
    </section>
  );
}
