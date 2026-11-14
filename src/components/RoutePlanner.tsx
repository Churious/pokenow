import type { ScoredHotspot, TravelState } from '../types';
import { formatClockShort } from '../lib/time';
import { spotHref } from '../lib/routes';
import { planRoute, STOP_DWELL_SECONDS } from '../lib/planner';
import { useI18n } from '../i18n';
import { StatusMark } from './StatusBadge';

/**
 * "A → wait → B → wait → C" for the next few hours.
 * The route is derived from the same ranked list as the recommendation, so the
 * first stop always agrees with the hero card. See `lib/planner.ts` for the rules.
 */
export function RoutePlanner({
  ranked,
  now,
  travel,
}: {
  ranked: ScoredHotspot[];
  now: Date;
  travel: TravelState;
}) {
  const { t, dur, num } = useI18n();
  const route = planRoute(ranked, now);
  const origin =
    travel.mode === 'free'
      ? null
      : travel.origin.label === 'your last spot'
        ? t.travel.yourLastSpot
        : travel.origin.label;

  return (
    <section aria-labelledby="route-title" className="border-b border-rule py-6">
      <h2 id="route-title" className="semi-condensed text-lg font-bold text-ink">
        {t.route.title}
      </h2>
      <p className="mt-1 max-w-prose text-sm text-dim">{t.route.intro}</p>

      {route.stops.length === 0 ? (
        <p className="mt-3 max-w-prose text-sm text-ink">{t.route.empty}</p>
      ) : (
        <>
          <ol className="mt-4 divide-y divide-rule border-y border-rule">
            {route.stops.map((stop, i) => {
              const from = i === 0 ? origin : route.stops[i - 1].hotspot.city;
              const showLeg = from !== null && (i > 0 || stop.waitSeconds > 0);
              return (
                <li
                  key={stop.hotspot.id}
                  className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-x-3 py-3"
                >
                  <span className="semi-condensed pt-1 text-right text-sm text-faint tabular-nums">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-baseline gap-x-2">
                      <a
                        href={spotHref(stop.hotspot.id)}
                        className="condensed text-xl leading-tight font-extrabold text-ink hover:underline hover:underline-offset-4"
                      >
                        {stop.hotspot.city}
                      </a>
                      <span className="truncate text-sm text-dim">{stop.hotspot.spot}</span>
                    </p>
                    {/* No "·" separator: on phones the line wraps and a dot would dangle at the end. */}
                    <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm">
                      <StatusMark scored={stop.atArrival} />
                      <span className="text-dim">{t.route.arrive(formatClockShort(stop.atArrival.clock))}</span>
                      <span className="text-dim">{t.list.endsIn(dur(stop.atArrival.secondsLeftInWindow))}</span>
                    </p>
                    {showLeg && from && (
                      <p className="mt-1 text-sm text-dim">
                        {t.route.leg(
                          from,
                          `${num(stop.distanceKm ?? 0)} ${t.units.km}`,
                          stop.waitSeconds > 0 ? dur(stop.waitSeconds) : t.route.noWait,
                        )}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-3 text-sm text-ink">
            {t.route.summary(
              route.stops.length,
              dur(route.totalSeconds),
              `${num(route.totalDistanceKm)} ${t.units.km}`,
            )}
          </p>
          <p className="mt-1 max-w-prose text-xs text-faint">
            {t.route.note(t.travel.minutes(STOP_DWELL_SECONDS / 60))}
          </p>
        </>
      )}
    </section>
  );
}
