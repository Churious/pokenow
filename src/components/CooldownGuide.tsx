import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { COOLDOWN_TABLE } from '../data/cooldowns';

function formatMinutes(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function bandLabel(i: number): string {
  const step = COOLDOWN_TABLE[i];
  const prev = i === 0 ? 0 : COOLDOWN_TABLE[i - 1].maxKm;
  const f = (n: number) => n.toLocaleString('en-US');
  if (step.maxKm === Infinity) return `Over ${f(prev)} km`;
  return i === 0 ? `Up to ${f(step.maxKm)} km` : `${f(prev)} to ${f(step.maxKm)} km`;
}

/** Collapsible distance → wait reference table. */
export function CooldownGuide() {
  const [open, setOpen] = useState(false);

  return (
    <section className="border-b border-rule">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="cooldown-panel"
        className="flex w-full items-center justify-between gap-3 py-4 text-left"
      >
        <span className="semi-condensed text-lg font-bold text-ink">Cooldown reference</span>
        <ChevronDown className={`size-5 text-dim transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && (
        <div id="cooldown-panel" className="pb-6">
          <p className="max-w-prose text-sm text-dim">
            How long to wait after a catch, spin, raid or gym action before acting somewhere far away. These are
            community estimates, not official numbers, and sources disagree in the middle of the range. The two-hour
            maximum is the part players agree on. PokeSpot rounds up to the safer value.
          </p>

          <table className="mt-4 w-full max-w-md text-sm">
            <caption className="sr-only">Distance and suggested wait</caption>
            <thead>
              <tr className="text-left text-dim">
                <th scope="col" className="pb-2 font-medium">
                  Distance
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  Wait
                </th>
              </tr>
            </thead>
            <tbody>
              {COOLDOWN_TABLE.map((step, i) => (
                <tr key={step.maxKm} className="border-t border-rule">
                  <td className="py-2 text-ink">{bandLabel(i)}</td>
                  <td className={`py-2 text-right font-semibold ${step.minutes >= 120 ? 'text-gold' : 'text-ink'}`}>
                    {formatMinutes(step.minutes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
