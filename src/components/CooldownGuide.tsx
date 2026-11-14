import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { COOLDOWN_TABLE } from '../data/cooldowns';
import { useI18n } from '../i18n';

/** Collapsible distance → wait reference table. */
export function CooldownGuide() {
  const [open, setOpen] = useState(false);
  const { t, num } = useI18n();

  const minutes = (min: number) => (min < 60 ? t.travel.minutes(min) : t.travel.minutes(min).replace(String(min), num(min)));
  const waitLabel = (min: number) => {
    if (min < 60) return minutes(min);
    const h = Math.floor(min / 60);
    const m = min % 60;
    const sp = t.units.spaced ? ' ' : '';
    return m ? `${h}${sp}${t.units.h}${t.units.sep}${m}${sp}${t.units.min}` : `${h}${sp}${t.units.h}`;
  };
  const band = (i: number) => {
    const step = COOLDOWN_TABLE[i];
    const prev = i === 0 ? 0 : COOLDOWN_TABLE[i - 1].maxKm;
    if (step.maxKm === Infinity) return t.cooldown.over(num(prev));
    return i === 0 ? t.cooldown.upTo(num(step.maxKm)) : t.cooldown.range(num(prev), num(step.maxKm));
  };

  return (
    <section className="border-b border-rule">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="cooldown-panel"
        className="flex w-full items-center justify-between gap-3 py-4 text-left"
      >
        <span className="semi-condensed text-lg font-bold text-ink">{t.cooldown.title}</span>
        <ChevronDown className={`size-5 text-dim transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && (
        <div id="cooldown-panel" className="pb-6">
          <p className="max-w-prose text-sm text-dim">{t.cooldown.intro}</p>

          <table className="mt-4 w-full max-w-md text-sm">
            <caption className="sr-only">{t.cooldown.title}</caption>
            <thead>
              <tr className="text-left text-dim">
                <th scope="col" className="pb-2 font-medium">
                  {t.cooldown.distance}
                </th>
                <th scope="col" className="pb-2 text-right font-medium">
                  {t.cooldown.wait}
                </th>
              </tr>
            </thead>
            <tbody>
              {COOLDOWN_TABLE.map((step, i) => (
                <tr key={step.maxKm} className="border-t border-rule">
                  <td className="py-2 text-ink">{band(i)}</td>
                  <td className={`py-2 text-right font-semibold ${step.minutes >= 120 ? 'text-gold' : 'text-ink'}`}>
                    {waitLabel(step.minutes)}
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
