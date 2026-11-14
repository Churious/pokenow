import { ExternalLink } from 'lucide-react';
import { SCHEDULE, type ScheduledEvent } from '../data/schedule';
import { upcomingEvents, type EventStatus } from '../lib/schedule';
import { useI18n } from '../i18n';

/** Shown entries; the full list lives in data/schedule.ts. */
const MAX_EVENTS = 5;

const visitorZone = (() => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return 'UTC';
  }
})();

/** "YYYY-MM-DD" of `now` in the visitor's zone. */
function todayInZone(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: visitorZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
}

function daysBetween(from: string, to: string): number {
  const ms = (d: string) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10));
  return Math.round((ms(to) - ms(from)) / 86_400_000);
}

/**
 * Officially announced events (data/schedule.ts), with the date and local-time
 * window, and where the visitor stands: upcoming, on now, or over here but still
 * running further west. Unannounced times are shown as such, never assumed.
 */
export function EventSchedule({ now }: { now: Date }) {
  const { t, locale, dur } = useI18n();
  const list = upcomingEvents(SCHEDULE, now, visitorZone).slice(0, MAX_EVENTS);
  const today = todayInZone(now);

  const dateLabel = (e: ScheduledEvent) => {
    const f = new Intl.DateTimeFormat(locale, { timeZone: 'UTC', month: 'short', day: 'numeric', weekday: 'short' });
    const at = (d: string) => new Date(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)));
    return e.endDate && e.endDate !== e.date ? f.formatRange(at(e.date), at(e.endDate)) : f.format(at(e.date));
  };

  const stateLabel = ({ event, state }: EventStatus): { text: string; live: boolean } => {
    const timed = Boolean(event.start && event.end);
    if (state.phase === 'live') {
      return { text: timed ? t.schedule.liveHere(dur(state.secondsLeft)) : t.schedule.liveTodayTbd, live: true };
    }
    if (state.phase === 'elsewhere') return { text: t.schedule.elsewhere, live: false };
    // Before it starts: a countdown only when the time is official, otherwise whole days.
    if (timed && state.secondsUntil < 2 * 86_400) return { text: t.schedule.startsIn(dur(state.secondsUntil)), live: false };
    const days = daysBetween(today, event.date);
    return { text: days <= 0 ? t.schedule.today : t.schedule.inDays(days), live: false };
  };

  return (
    <section aria-labelledby="schedule-title" className="mt-10">
      <h2 id="schedule-title" className="semi-condensed text-lg font-bold text-ink">
        {t.schedule.title}
      </h2>
      <p className="mt-1 max-w-prose text-sm text-dim">{t.schedule.intro}</p>

      {list.length === 0 ? (
        <p className="mt-3 text-sm text-ink">{t.schedule.empty}</p>
      ) : (
        <ul className="mt-3 divide-y divide-rule border-y border-rule">
          {list.map((s) => {
            const { event } = s;
            const state = stateLabel(s);
            return (
              <li key={event.id} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-x-4 py-3 sm:grid-cols-[8rem_minmax(0,1fr)]">
                <p className="semi-condensed pt-0.5 text-sm font-semibold text-ink">{dateLabel(event)}</p>
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{event.name}</p>
                  <p className="mt-0.5 text-sm text-dim">
                    {event.start && event.end
                      ? t.schedule.localTime(`${event.start}–${event.end}`)
                      : t.schedule.timeTbd}
                  </p>
                  <p className={`mt-0.5 text-sm ${state.live ? 'font-medium text-gold' : 'text-dim'}`}>{state.text}</p>
                  <a
                    href={event.source}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-flex items-center gap-1 text-xs text-faint underline underline-offset-4 hover:text-ink"
                  >
                    {t.schedule.source}
                    <ExternalLink className="size-3" aria-hidden />
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-3 max-w-prose text-xs text-faint">{t.schedule.weekly}</p>
    </section>
  );
}
