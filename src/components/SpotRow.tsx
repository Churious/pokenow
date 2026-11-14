import type { ScoredHotspot } from '../types';
import { formatClock, getUtcOffsetLabel } from '../lib/time';
import { formatCoords } from '../lib/geo';
import { spotHref } from '../lib/routes';
import { useI18n } from '../i18n';
import type { Messages } from '../i18n/types';
import { CopyCoordsButton } from './CopyCoordsButton';
import { CrowdGrade, StatusMark } from './StatusBadge';

function timingNote(s: ScoredHotspot, t: Messages, dur: (n: number) => string): string {
  if (s.plan.waitSeconds > 0) return t.list.wait(dur(s.plan.waitSeconds));
  if (s.status === 'raid-hour') return t.list.endsIn(dur(s.secondsLeftInWindow));
  if (s.status === 'active')
    return s.nextWindow === 'golden'
      ? t.list.goldenIn(dur(s.secondsUntilNextWindow))
      : t.list.endsIn(dur(s.secondsLeftInWindow));
  return t.list.opensIn(dur(s.secondsUntilNextWindow));
}

/** One line of the ranked list. Rank number is real ordering information. */
export function SpotRow({ scored, rank, now }: { scored: ScoredHotspot; rank: number; now: Date }) {
  const { t, dur, num } = useI18n();
  const { hotspot, clock, status, plan } = scored;
  const timeColor = status === 'raid-hour' ? 'text-gold' : status === 'active' ? 'text-ink' : 'text-faint';

  return (
    <li className="grid grid-cols-[2rem_1fr_auto] gap-x-3 gap-y-2 border-b border-rule py-4">
      <span className="semi-condensed pt-1 text-sm text-faint">{rank}</span>

      <div className="min-w-0">
        <h3 className="condensed truncate text-2xl leading-tight font-extrabold text-ink">
          <a
            href={spotHref(hotspot.id)}
            aria-label={t.list.details(hotspot.city)}
            className="hover:underline hover:underline-offset-4"
          >
            {hotspot.city}
          </a>
        </h3>
        <p className="truncate text-sm text-dim">{hotspot.spot}</p>
      </div>

      <div className="text-right">
        <p className={`condensed text-2xl leading-tight font-bold ${timeColor}`}>{formatClock(clock)}</p>
        <p className="text-xs text-dim">{getUtcOffsetLabel(now, hotspot.timeZone)}</p>
      </div>

      <div className="col-start-2 col-end-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
        <StatusMark scored={scored} />
        <span className={plan.waitSeconds > 0 ? 'font-medium text-gold' : 'text-dim'}>{timingNote(scored, t, dur)}</span>
        {plan.distanceKm !== null && (
          <span className="text-dim">
            {num(plan.distanceKm)} {t.units.km}
          </span>
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
