import { useState } from 'react';
import type { Hotspot, TravelState } from '../types';
import { secondsUntilFullyFree } from '../lib/scoring';
import { formatDuration } from '../lib/time';

interface Props {
  hotspots: readonly Hotspot[];
  travel: TravelState;
  onChange: (next: TravelState) => void;
  now: Date;
}

const MODES: { value: TravelState['mode']; label: string }[] = [
  { value: 'free', label: 'Free to move' },
  { value: 'cooldown', label: 'Cooling down' },
  { value: 'softban', label: 'Soft-banned' },
];

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
 * (catch, spin, raid, gym…) you can go anywhere, so the panel shows that clock too.
 */
export function TravelPanel({ hotspots, travel, onChange, now }: Props) {
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
        Your cooldown
      </h2>
      <p className="mt-1 max-w-prose text-sm text-dim">
        Tell PokeSpot where you last caught, spun or raided. Spots you can’t reach safely yet move down the list.
      </p>

      <div role="radiogroup" aria-label="Cooldown status" className="mt-4 grid grid-cols-3 rounded-md ring-1 ring-rule">
        {MODES.map((m) => {
          const on = travel.mode === m.value;
          return (
            <button
              key={m.value}
              role="radio"
              aria-checked={on}
              onClick={() => setMode(m.value)}
              className={`h-11 px-2 text-sm font-semibold first:rounded-l-md last:rounded-r-md ${
                on ? (m.value === 'softban' ? 'bg-hot text-night' : 'bg-ink text-night') : 'text-dim hover:text-ink'
              }`}
            >
              {m.label}
            </button>
          );
        })}
      </div>

      {active && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm text-dim">
            Last action at
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
              <option value={CUSTOM}>Other place (enter coordinates)</option>
            </select>
          </label>

          <div className="text-sm text-dim">
            <span id="ago-label">How long ago</span>
            <div role="group" aria-labelledby="ago-label" className="mt-1 flex flex-wrap gap-1.5">
              {AGO_PRESETS.map((m) => (
                <button
                  key={m}
                  onClick={() => onChange({ ...active, lastActionAt: now.getTime() - m * 60000 })}
                  className="h-11 rounded-md px-3 text-ink ring-1 ring-rule hover:ring-dim"
                >
                  {m === 0 ? 'Just now' : `${m} min`}
                </button>
              ))}
            </div>
          </div>

          {!selectedSpot && (
            <label className="block text-sm text-dim sm:col-span-2">
              Coordinates of your last action
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
                    if (!c) return setCustomError('Use “latitude, longitude”, for example 37.5665, 126.9780.');
                    onChange({ ...active, origin: { ...c, label: 'your last spot' } });
                  }}
                  className="h-11 shrink-0 rounded-md bg-ink px-4 font-semibold text-night"
                >
                  Set
                </button>
              </div>
              {customError && <span className="mt-1 block text-hot">{customError}</span>}
            </label>
          )}

          <p className="text-sm text-ink sm:col-span-2">
            {freeIn > 0 ? (
              <>
                Last action {minutesAgo === 0 ? 'just now' : `${minutesAgo} min ago`} in {active.origin.label}. You can
                go anywhere in <strong className="text-gold">{formatDuration(freeIn)}</strong>.
              </>
            ) : (
              <>Two hours have passed since your last action, so every spot is safe now.</>
            )}
          </p>

          {travel.mode === 'softban' && (
            <div className="rounded-md bg-hot/10 p-3 text-sm text-ink ring-1 ring-hot/40 sm:col-span-2">
              <p className="font-semibold text-hot">While soft-banned</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-ink/90">
                <li>Stop catching and spinning until the wait for your next spot has passed. Retrying doesn’t lift it.</li>
                <li>Pick a spot with a short wait below, or simply wait out the two-hour clock above.</li>
                <li>
                  Set “Last action at” to where your last <em>successful</em> action happened, not where you got
                  soft-banned.
                </li>
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
