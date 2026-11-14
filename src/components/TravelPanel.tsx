import { useState } from 'react';
import type { Hotspot, TravelState } from '../types';
import { secondsUntilFullyFree } from '../lib/scoring';
import { useI18n } from '../i18n';

interface Props {
  hotspots: readonly Hotspot[];
  travel: TravelState;
  onChange: (next: TravelState) => void;
  now: Date;
}

const MODES = ['free', 'cooldown', 'softban'] as const satisfies readonly TravelState['mode'][];

const AGO_PRESETS = [0, 15, 30, 60, 90];
const CUSTOM = '__custom__';

/** Parses "35.6896, 139.7006" (comma and/or spaces). */
function parseCoords(text: string): { lat: number; lng: number } | null {
  const m = text.trim().match(/^(-?\d+(?:\.\d+)?)[,\s]+(-?\d+(?:\.\d+)?)$/);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}

/**
 * "Where did you last act, and when?" — feeds the cooldown-aware ranking.
 * The rule players rely on: after 2 hours with no cooldown-triggering action
 * (catch, spin, raid, gym…) every spot is ready again, so the panel shows that clock too.
 */
export function TravelPanel({ hotspots, travel, onChange, now }: Props) {
  const { t, dur } = useI18n();
  const firstSpot = hotspots[0];
  const [customText, setCustomText] = useState('');
  const [customError, setCustomError] = useState<string | null>(null);
  const [pickingCustom, setPickingCustom] = useState(false);

  const setMode = (mode: TravelState['mode']) => {
    if (mode === 'free') return onChange({ mode: 'free' });
    if (travel.mode !== 'free') return onChange({ ...travel, mode });
    onChange({
      mode,
      origin: { lat: firstSpot.lat, lng: firstSpot.lng, label: firstSpot.city },
      lastActionAt: now.getTime(),
    });
  };

  const active = travel.mode !== 'free' ? travel : null;
  const minutesAgo = active ? Math.max(0, Math.floor((now.getTime() - active.lastActionAt) / 60000)) : 0;
  const freeIn = secondsUntilFullyFree(travel, now);
  const matchedSpot = active
    ? hotspots.find((h) => h.lat === active.origin.lat && h.lng === active.origin.lng)
    : undefined;
  const selectedSpot = pickingCustom ? undefined : matchedSpot;

  const field = 'h-11 w-full rounded-md bg-deck px-3 text-ink ring-1 ring-rule focus:ring-gold focus:outline-none';

  return (
    <section aria-labelledby="travel-title" className="border-y border-rule py-5">
      <h2 id="travel-title" className="semi-condensed text-lg font-bold text-ink">
        {t.travel.title}
      </h2>
      <p className="mt-1 max-w-prose text-sm text-dim">{t.travel.intro}</p>

      <div role="radiogroup" aria-label={t.travel.statusLabel} className="mt-4 grid grid-cols-3 rounded-md ring-1 ring-rule">
        {MODES.map((m) => {
          const on = travel.mode === m;
          const label = m === 'free' ? t.travel.ready : m === 'cooldown' ? t.travel.cooldown : t.travel.softban;
          return (
            <button
              key={m}
              role="radio"
              aria-checked={on}
              onClick={() => setMode(m)}
              className={`min-h-11 px-2 py-1 text-sm leading-tight font-semibold first:rounded-l-md last:rounded-r-md ${
                on ? (m === 'softban' ? 'bg-hot text-night' : 'bg-ink text-night') : 'text-dim hover:text-ink'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {active && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-dim">
            {t.travel.lastActionAt}
            <select
              className={`${field} mt-1`}
              value={selectedSpot?.id ?? CUSTOM}
              onChange={(e) => {
                const h = hotspots.find((x) => x.id === e.target.value);
                setPickingCustom(!h);
                if (h) onChange({ ...active, origin: { lat: h.lat, lng: h.lng, label: h.city } });
              }}
            >
              {hotspots.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.city}, {h.spot}
                </option>
              ))}
              <option value={CUSTOM}>{t.travel.otherPlace}</option>
            </select>
          </label>

          <div className="text-sm text-dim">
            <span id="ago-label">{t.travel.howLongAgo}</span>
            <div role="group" aria-labelledby="ago-label" className="mt-1 flex flex-wrap gap-1.5">
              {AGO_PRESETS.map((m) => (
                <button
                  key={m}
                  onClick={() => onChange({ ...active, lastActionAt: now.getTime() - m * 60000 })}
                  className="h-11 rounded-md px-3 text-ink ring-1 ring-rule hover:ring-dim"
                >
                  {m === 0 ? t.travel.justNow : t.travel.minutes(m)}
                </button>
              ))}
            </div>
          </div>

          {!selectedSpot && (
            <label className="block text-sm text-dim sm:col-span-2">
              {t.travel.coordsLabel}
              <div className="mt-1 flex gap-2">
                <input
                  className={field}
                  inputMode="decimal"
                  placeholder="37.5665, 126.9780"
                  value={customText}
                  onChange={(e) => {
                    setCustomText(e.target.value);
                    setCustomError(null);
                  }}
                />
                <button
                  onClick={() => {
                    const c = parseCoords(customText);
                    if (!c) return setCustomError(t.travel.coordsError);
                    onChange({ ...active, origin: { ...c, label: 'your last spot' } });
                  }}
                  className="h-11 shrink-0 rounded-md bg-ink px-4 font-semibold text-night"
                >
                  {t.travel.set}
                </button>
              </div>
              {customError && <span className="mt-1 block text-hot">{customError}</span>}
            </label>
          )}

          <p className="text-sm text-ink sm:col-span-2">
            {freeIn > 0
              ? t.travel.summary(
                  t.travel.minAgo(minutesAgo),
                  active.origin.label === 'your last spot' ? t.travel.yourLastSpot : active.origin.label,
                  dur(freeIn),
                )
              : t.travel.allReady}
          </p>

          {travel.mode === 'softban' && (
            <div className="rounded-md bg-hot/10 p-3 text-sm text-ink ring-1 ring-hot/40 sm:col-span-2">
              <p className="font-semibold text-hot">{t.travel.softbanTitle}</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-ink/90">
                <li>{t.travel.softban1}</li>
                <li>{t.travel.softban2}</li>
                <li>{t.travel.softban3}</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
