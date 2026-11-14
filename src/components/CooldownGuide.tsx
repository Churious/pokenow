import { useMemo, useState } from 'react';
import { ChevronDown, Info, Route, Timer } from 'lucide-react';
import type { Hotspot } from '../types';
import { COOLDOWN_TABLE, suggestedCooldownMinutes } from '../data/cooldowns';
import { distanceKm } from '../lib/geo';

function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

function bandLabel(i: number): string {
  const step = COOLDOWN_TABLE[i];
  const prev = i === 0 ? 0 : COOLDOWN_TABLE[i - 1].maxKm;
  if (step.maxKm === Infinity) return `> ${prev.toLocaleString('en-US')} km`;
  return `${i === 0 ? '≤' : `${prev.toLocaleString('en-US')}–`}${step.maxKm.toLocaleString('en-US')} km`;
}

/**
 * Collapsible "Cooldown Reference Guide": a distance → wait table plus a tiny
 * calculator between any two hotspots in the dataset.
 */
export function CooldownGuide({ hotspots }: { hotspots: readonly Hotspot[] }) {
  const [open, setOpen] = useState(false);
  const [fromId, setFromId] = useState(hotspots[0]?.id ?? '');
  const [toId, setToId] = useState(hotspots[1]?.id ?? '');

  const result = useMemo(() => {
    const a = hotspots.find((h) => h.id === fromId);
    const b = hotspots.find((h) => h.id === toId);
    if (!a || !b) return null;
    const km = distanceKm(a, b);
    return { km, minutes: suggestedCooldownMinutes(km) };
  }, [hotspots, fromId, toId]);

  const selectCls =
    'h-11 w-full rounded-xl border border-line bg-night px-3 text-sm text-slate-100 focus:border-go focus:outline-none';

  return (
    <section className="rounded-2xl border border-line bg-panel">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="cooldown-panel"
        className="flex w-full items-center justify-between gap-3 p-4 text-left"
      >
        <span className="flex items-center gap-2 font-semibold text-white">
          <Timer className="size-5 text-raid" aria-hidden />
          Cooldown Reference Guide
        </span>
        <ChevronDown className={`size-5 text-slate-400 transition ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && (
        <div id="cooldown-panel" className="space-y-4 border-t border-line p-4">
          <p className="flex gap-2 rounded-xl bg-raid/10 p-3 text-xs leading-relaxed text-amber-100/90 ring-1 ring-raid/30">
            <Info className="mt-0.5 size-4 shrink-0 text-raid" aria-hidden />
            Unofficial, community-compiled estimates — the game has never published a cooldown table and sources
            disagree in the mid-range. Most agree the wait caps at about 2 hours. Always follow the game’s Terms of
            Service.
          </p>

          {/* Calculator */}
          <div className="rounded-xl bg-night/60 p-3 ring-1 ring-line">
            <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-200">
              <Route className="size-4 text-go" aria-hidden /> Spot-to-spot estimate
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="text-xs text-slate-400">
                From
                <select className={selectCls} value={fromId} onChange={(e) => setFromId(e.target.value)}>
                  {hotspots.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.city} — {h.spot}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs text-slate-400">
                To
                <select className={selectCls} value={toId} onChange={(e) => setToId(e.target.value)}>
                  {hotspots.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.city} — {h.spot}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {result && (
              <p className="tabular mt-3 text-sm text-slate-300">
                <span className="font-mono text-white">
                  {Math.round(result.km).toLocaleString('en-US')} km
                </span>{' '}
                → suggested wait{' '}
                <span className="font-mono font-bold text-amber-300">{formatMinutes(result.minutes)}</span>
              </p>
            )}
          </div>

          {/* Table */}
          <table className="tabular w-full text-sm">
            <caption className="sr-only">Distance to suggested cooldown</caption>
            <thead>
              <tr className="text-left text-xs text-slate-500 uppercase">
                <th scope="col" className="pb-2 font-medium">
                  Distance
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  Wait
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {COOLDOWN_TABLE.map((step, i) => (
                <tr key={step.maxKm}>
                  <td className="py-1.5 font-mono text-slate-300">{bandLabel(i)}</td>
                  <td className="py-1.5 text-right font-mono text-slate-100">{formatMinutes(step.minutes)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
