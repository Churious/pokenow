import type { ScoredHotspot } from '../types';
import { densityGrade } from '../lib/scoring';

const STYLES = {
  'raid-hour': 'bg-raid/15 text-amber-300 ring-raid/50',
  active: 'bg-go/15 text-emerald-300 ring-go/40',
  quiet: 'bg-slate-500/10 text-slate-400 ring-slate-500/30',
} as const;

/** 🔥 Raid Hour / 🟢 Active / 💤 Quiet */
export function StatusBadge({ scored }: { scored: ScoredHotspot }) {
  const label =
    scored.status === 'raid-hour'
      ? `🔥 ${scored.eventLabel ?? 'Raid Hour'}`
      : scored.status === 'active'
        ? '🟢 Active'
        : '💤 Quiet';
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ${STYLES[scored.status]}`}
    >
      {label}
    </span>
  );
}

const GRADE_STYLES = {
  S: 'text-raid-hot ring-raid-hot/40',
  A: 'text-amber-300 ring-raid/30',
  B: 'text-emerald-300 ring-go/30',
  C: 'text-slate-400 ring-slate-500/30',
} as const;

/** Player-density grade derived from the hotspot's popularity weight. */
export function DensityChip({ popularity }: { popularity: number }) {
  const grade = densityGrade(popularity);
  return (
    <span
      title={`Community popularity weight: ${popularity}/100`}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${GRADE_STYLES[grade]}`}
    >
      Density {grade}
      <span className="font-normal text-slate-500">· {popularity}</span>
    </span>
  );
}
