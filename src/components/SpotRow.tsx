import type { ScoredHotspot } from '../types';
import { formatClock, getUtcOffsetLabel } from '../lib/time';
import { formatCoords } from '../lib/geo';
import { spotHref } from '../lib/routes';
import { useI18n } from '../i18n';
import type { Messages } from '../i18n/types';
import { CopyCoordsButton } from './CopyCoordsButton';
import { StatusMark } from './StatusBadge';

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
 *  - Wide desktop (xl, 1280px+): a table-like row, so the whole ranking fits on screen.
 *    Between 1024 and 1280 the sidebar leaves too little room, so rows stay stacked.
 */
export function SpotRow({ scored, rank, now }: { scored: ScoredHotspot; rank: number; now: Date }) {
  const { t, dur, num } = useI18n();
  const { hotspot, clock, status, plan } = scored;
  const timeColor = status === 'raid-hour' ? 'text-gold' : status === 'active' ? 'text-ink' : 'text-faint';

  return (
    <li
      className={`grid grid-cols-[1.25rem_1fr_auto] gap-x-3 gap-y-2 border-b border-rule py-4 xl:col-span-full xl:grid-cols-subgrid xl:items-center xl:py-3 ${
        status === 'raid-hour' ? 'xl:shadow-[inset_2px_0_0_var(--color-gold)]' : ''
      }`}
    >
      <span className="semi-condensed pt-1.5 text-right text-sm text-faint tabular-nums xl:pt-0">{rank}</span>

      <div className="min-w-0">
        <h3 className="condensed truncate text-2xl leading-tight font-extrabold text-ink xl:text-xl">
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

      <div className="text-right xl:text-left">
        <p className={`condensed text-2xl leading-tight font-bold xl:text-xl ${timeColor}`}>{formatClock(clock)}</p>
        <p className="text-xs text-dim">{getUtcOffsetLabel(now, hotspot.timeZone)}</p>
      </div>

      {/* Phones: one wrapping line. Desktop table: always two lines (status, then timing),
          so every row has the same height as the name and clock beside it. */}
      <div className="col-start-2 col-end-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm xl:col-auto xl:flex-col xl:flex-nowrap xl:items-start xl:gap-y-0.5">
        <span className="flex items-center whitespace-nowrap">
          <StatusMark scored={scored} />
        </span>
        <span className="flex min-w-0 max-w-full items-center gap-x-3 whitespace-nowrap">
          <span className={`truncate ${plan.waitSeconds > 0 ? 'font-medium text-gold' : 'text-dim'}`}>
            {timingNote(scored, t, dur)}
          </span>
          {plan.distanceKm !== null && (
            <span className="text-dim">
              {num(plan.distanceKm)} {t.units.km}
            </span>
          )}
        </span>
      </div>

      <div className="col-start-2 col-end-4 flex items-center justify-between gap-3 xl:col-auto xl:justify-end">
        <code className="truncate font-sans text-sm text-dim select-all">{formatCoords(hotspot)}</code>
        <CopyCoordsButton hotspot={hotspot} />
      </div>
    </li>
  );
}
