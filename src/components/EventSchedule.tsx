import type { ReactNode } from 'react';
import { ExternalLink } from 'lucide-react';
import { useGoEvents } from '../hooks/useGoEvents';
import {
  FEED_SOURCE_URL,
  eventStatuses,
  isLocalTime,
  wallClock,
  wallDate,
  type EventStatus,
  type GoEvent,
} from '../lib/schedule';
import { useI18n } from '../i18n';
import type { Messages } from '../i18n/types';

/** How far ahead the list looks, and how many rows it shows. */
const HORIZON_DAYS = 14;
const MAX_EVENTS = 10;
const OFFICIAL_NEWS = 'https://pokemongo.com/news';

const visitorZone = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
})();

const ymdInZone = (ms: number) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: visitorZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(
    ms,
  );
const dayMs = (ymd: string) => Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10));

function kindLabel(e: GoEvent, t: Messages): string {
  switch (e.kind) {
    case 'raid-hour':
      return t.status.raidHour;
    case 'spotlight':
      return t.status.spotlightHour;
    case 'community-day':
      return t.schedule.kinds.communityDay;
    case 'raid-day':
      return t.schedule.kinds.raidDay;
    default:
      return t.schedule.kinds.event;
  }
}

/**
 * Raid bosses on now, then the next two weeks of events from the community feed
 * (lib/schedule.ts). Names only — no Pokémon artwork (copyright).
 */
export function EventSchedule({ now }: { now: Date }) {
  const { t, locale, dur } = useI18n();
  const feed = useGoEvents();

  const dateFmt = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', month: 'short', day: 'numeric', weekday: 'short' });
  const shortDate = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', month: 'short', day: 'numeric' });
  const timeFmt = new Intl.DateTimeFormat(locale, { timeZone: visitorZone, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

  /** Calendar date shown for an event: its local date, or the visitor's date for global events. */
  const startYmd = (s: EventStatus) => (isLocalTime(s.event) ? wallDate(s.event.start) : ymdInZone(s.startsAt));
  const endYmd = (s: EventStatus) => (isLocalTime(s.event) ? wallDate(s.event.end) : ymdInZone(s.endsAt));

  const dateLabel = (s: EventStatus) => {
    const a = startYmd(s);
    const b = endYmd(s);
    return a === b ? dateFmt.format(dayMs(a)) : dateFmt.formatRange(dayMs(a), dayMs(b));
  };

  const timeLabel = (s: EventStatus) => {
    const e = s.event;
    if (isLocalTime(e)) {
      const range =
        wallDate(e.start) === wallDate(e.end)
          ? `${wallClock(e.start)}–${wallClock(e.end)}`
          : `${shortDate.format(dayMs(wallDate(e.start)))} ${wallClock(e.start)} – ${shortDate.format(
              dayMs(wallDate(e.end)),
            )} ${wallClock(e.end)}`;
      return t.schedule.localTime(range);
    }
    return t.schedule.yourTime(`${timeFmt.format(s.startsAt)}–${timeFmt.format(s.endsAt)}`);
  };

  const stateLabel = ({ state }: EventStatus, ymd: string): { text: string; live: boolean } => {
    if (state.phase === 'live') return { text: t.schedule.liveHere(dur(state.secondsLeft)), live: true };
    if (state.phase === 'elsewhere') return { text: t.schedule.elsewhere, live: false };
    if (state.secondsUntil < 86_400) return { text: t.schedule.startsIn(dur(state.secondsUntil)), live: false };
    const days = Math.round((dayMs(ymd) - dayMs(ymdInZone(now.getTime()))) / 86_400_000);
    return { text: days <= 0 ? t.schedule.today : t.schedule.inDays(days), live: false };
  };

  let body: ReactNode;
  if (feed.status === 'loading') {
    body = <p className="mt-3 text-sm text-dim">{t.schedule.loading}</p>;
  } else if (feed.status === 'error') {
    body = (
      <p className="mt-3 text-sm text-ink">
        {t.schedule.error}{' '}
        <a href={OFFICIAL_NEWS} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">
          {t.schedule.officialNews}
        </a>
      </p>
    );
  } else {
    const all = eventStatuses(feed.events, now, visitorZone);
    const bosses = all.filter((s) => s.event.kind === 'raid-bosses' && s.state.phase === 'live' && s.event.pokemon.length);
    const horizon = now.getTime() + HORIZON_DAYS * 86_400_000;
    const upcoming = all
      .filter((s) => s.event.kind !== 'raid-bosses' && s.startsAt < horizon)
      .slice(0, MAX_EVENTS);

    body = (
      <>
        {bosses.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-semibold text-ink">{t.schedule.bossesTitle}</h3>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {bosses.map((s) => (
                <li key={s.event.id} className="rounded-md bg-deck px-3 py-2.5">
                  <p className="semi-condensed text-base font-bold text-ink">{s.event.pokemon.join(', ')}</p>
                  <p className="mt-0.5 text-xs text-dim">
                    {s.event.name.replace(/^.* in /, '')} · {t.schedule.bossesUntil(shortDate.format(dayMs(endYmd(s))))}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        )}

        {upcoming.length === 0 ? (
          <p className="mt-4 text-sm text-ink">{t.schedule.empty}</p>
        ) : (
          <ul className="mt-4 divide-y divide-rule border-y border-rule">
            {upcoming.map((s) => {
              const state = stateLabel(s, startYmd(s));
              return (
                <li
                  key={s.event.id}
                  className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 py-3 sm:grid-cols-[9rem_minmax(0,1fr)]"
                >
                  <div>
                    <p className="semi-condensed text-sm font-semibold text-ink">{dateLabel(s)}</p>
                    <p className="mt-0.5 text-xs text-faint">{kindLabel(s.event, t)}</p>
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-ink">{s.event.name}</p>
                    {s.event.pokemon.length > 0 && s.event.kind === 'community-day' && (
                      <p className="text-sm text-ink">{s.event.pokemon.join(', ')}</p>
                    )}
                    <p className="mt-0.5 text-sm text-dim">
                      {timeLabel(s)}
                      {s.event.bonus && <span className="text-ink"> · {s.event.bonus}</span>}
                    </p>
                    <p className={`mt-0.5 text-sm ${state.live ? 'font-medium text-gold' : 'text-dim'}`}>{state.text}</p>
                    <a
                      href={s.event.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1 inline-flex items-center gap-1 text-xs text-faint underline underline-offset-4 hover:text-ink"
                    >
                      {t.schedule.details}
                      <ExternalLink className="size-3" aria-hidden />
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </>
    );
  }

  return (
    <section aria-labelledby="schedule-title">
      <h2 id="schedule-title" className="semi-condensed text-lg font-bold text-ink">
        {t.schedule.title}
      </h2>
      <p className="mt-1 max-w-prose text-sm text-dim">{t.schedule.intro}</p>
      {body}
      <p className="mt-3 max-w-prose text-xs text-faint">
        {t.schedule.weekly}{' '}
        {t.schedule.sourceNote}{' '}
        <a href={FEED_SOURCE_URL} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-ink">
          Leek Duck
        </a>
        {' · '}
        <a href={OFFICIAL_NEWS} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-ink">
          {t.schedule.officialNews}
        </a>
      </p>
    </section>
  );
}
