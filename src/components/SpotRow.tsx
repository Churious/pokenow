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

/**
 * One hotspot in the ranked list.
 *  - Phones/tablets: a stacked block (name + clock, then status, then coordinates).
 *  - Desktop (lg): a single table-like line, so the whole ranking fits on screen.
 */
export function SpotRow({ scored, rank, now }: { scored: ScoredHotspot; rank: number; now: Date }) {
  const { t, dur, num } = useI18n();
  const { hotspot, clock, status, plan } = scored;
  const timeColor = status === 'raid-hour' ? 'text-gold' : status === 'active' ? 'text-ink' : 'text-faint';

  return (
    <li
      className={`grid grid-cols-[2rem_1fr_auto] gap-x-3 gap-y-2 border-b border-rule py-4 lg:col-span-full lg:grid-cols-subgrid lg:items-center lg:py-2.5 ${
        status === 'raid-hour' ? 'lg:bg-gold/[0.04]' : ''
      }`}
    >
      <span className="semi-condensed pt-1 text-sm text-faint lg:pt-0">{rank}</span>

      <div className="min-w-0">
        <h3 className="condensed truncate text-2xl leading-tight font-extrabold text-ink lg:text-xl">
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

      <div className="text-right lg:text-left">
        <p className={`condensed text-2xl leading-tight font-bold lg:text-xl ${timeColor}`}>{formatClock(clock)}</p>
        <p className="text-xs text-dim">{getUtcOffsetLabel(now, hotspot.timeZone)}</p>
      </div>

      <div className="col-start-2 col-end-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm lg:col-auto lg:gap-x-3">
        <StatusMark scored={scored} />
        <span className={plan.waitSeconds > 0 ? 'font-medium text-gold' : 'text-dim'}>{timingNote(scored, t, dur)}</span>
        {plan.distanceKm !== null && (
          <span className="text-dim">
            {num(plan.distanceKm)} {t.units.km}
          </span>
        )}
        <CrowdGrade popularity={hotspot.popularity} />
      </div>

      <div className="col-start-2 col-end-4 flex items-center justify-between gap-3 lg:col-auto lg:justify-end">
        <code className="truncate font-sans text-sm text-dim select-all">{formatCoords(hotspot)}</code>
        <CopyCoordsButton hotspot={hotspot} />
      </div>
    </li>
  );
}
