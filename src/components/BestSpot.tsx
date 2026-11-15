import { useState } from 'react';
import type { ScoredHotspot, TravelState } from '../types';
import type { SpotTagKind, SpotTagsMap } from '../lib/tags';
import { formatClock, getUtcOffsetLabel } from '../lib/time';
import { formatCoords } from '../lib/geo';
import { spotHref } from '../lib/routes';
import { useI18n } from '../i18n';
import type { Messages } from '../i18n/types';
import { CopyCoordsButton } from './CopyCoordsButton';
import { StatusMark, eventName } from './StatusBadge';
import { Dial } from './Dial';
import { SpotTagBar } from './SpotTagBar';

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
export function BestSpot({
  ranked,
  now,
  travel,
  tags,
  onVoteTag,
}: {
  ranked: ScoredHotspot[];
  now: Date;
  travel: TravelState;
  tags?: SpotTagsMap;
  onVoteTag?: (spotId: string, tag: SpotTagKind) => Promise<'voted' | 'cooldown'>;
}) {
  const { t, dur, num, weekday } = useI18n();
  const [showCopyHint, setShowCopyHint] = useState(false);
  const best = ranked[0];
  if (!best) return null;
  const { hotspot, clock } = best;
  const origin =
    travel.mode === 'free'
      ? null
      : travel.origin.label === 'your last spot'
        ? t.travel.yourLastSpot
        : travel.origin.label;

  const handleCopied = () => {
    setShowCopyHint(true);
    window.setTimeout(() => setShowCopyHint(false), 5000);
  };

  return (
    <section
      aria-labelledby="best-title"
      className="relative py-3 md:grid md:grid-cols-[340px_1fr] md:items-center md:gap-10 md:py-6 xl:grid-cols-[380px_1fr] xl:py-10"
    >
      {/* Phones: a small dial beside the name so the answer and the tabs fit the first screen. */}
      <div className="absolute top-3 right-0 w-[6.25rem] rounded-full bg-deck p-1 sm:w-36 md:static md:mx-auto md:w-full md:max-w-[340px] md:p-2 xl:max-w-[380px]">
        <Dial ranked={ranked} bestId={hotspot.id} label={t.best.dialLabel} />
      </div>

      <div className="min-w-0">
        {/* Keep the heading clear of the small phone dial in the top-right corner. */}
        <div className="pr-28 sm:pr-40 md:pr-0">
        <p className="text-sm text-dim">{origin ? t.best.from(origin) : t.best.now}</p>
        <h1
          id="best-title"
          className="condensed mt-1 text-5xl leading-[0.9] font-black break-words text-ink sm:text-6xl md:text-7xl xl:text-8xl"
        >
          <a href={spotHref(hotspot.id)} className="hover:underline hover:decoration-2 hover:underline-offset-8">
            {hotspot.city}
          </a>
        </h1>
        <p className="semi-condensed mt-2 text-xl font-medium text-dim">{hotspot.spot}</p>
        </div>

        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 md:mt-5">
          <span className={`condensed text-4xl font-bold sm:text-5xl ${best.tier === 'golden' ? 'text-gold' : 'text-ink'}`}>
            {formatClock(clock)}
          </span>
          <span className="text-sm text-dim">
            {weekday(now, hotspot.timeZone)}, {getUtcOffsetLabel(now, hotspot.timeZone)}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <StatusMark scored={best} />
          {best.plan.distanceKm !== null && (
            <span className="text-dim">{t.best.kmAway(num(best.plan.distanceKm))}</span>
          )}
        </div>

        <p className="mt-3 max-w-prose text-ink">{arrivalSentence(best, t, dur)}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3 md:mt-5">
          <code className="font-sans text-lg font-semibold text-ink select-all">{formatCoords(hotspot)}</code>
          <CopyCoordsButton hotspot={hotspot} tone="primary" fullWidthMobile onCopied={handleCopied} />
        </div>

        {showCopyHint && (
          <p className={`mt-2 text-xs font-medium ${best.plan.waitSeconds > 0 ? 'text-gold' : 'text-peak'}`}>
            {best.plan.waitSeconds > 0
              ? t.livePulse.copyWaitHint(dur(best.plan.waitSeconds))
              : t.livePulse.copyReadyHint}
          </p>
        )}

        {onVoteTag && (
          <div className="mt-3">
            <SpotTagBar spotId={hotspot.id} entries={tags?.[hotspot.id]} onVote={onVoteTag} />
          </div>
        )}
      </div>
    </section>
  );
}
