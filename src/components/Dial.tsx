import { useState } from 'react';
import type { ScoredHotspot } from '../types';
import { WINDOWS } from '../lib/scoring';

/**
 * Clock design variants for comparison:
 * - 'radar': 24h radar HUD with concentric rings, day/night arc, golden glow,
 *            and an interactive center HUD showing the selected or best spot.
 * - 'arc':   Peak-focused 210° gauge (10:00–21:00) zooming into Golden Hour (18:00),
 *            with off-peak hotspots parked along the lower quiet arc.
 * - 'classic': Original minimal 24-hour dial.
 */
export type DialVariant = 'radar' | 'arc' | 'classic';

const SIZE = 320;
const C = SIZE / 2;
const R = 118; // track radius
const DAY = 86400;

const angle = (sec: number) => (sec / DAY) * 2 * Math.PI - Math.PI / 2;
const pt = (sec: number, r: number) => ({ x: C + r * Math.cos(angle(sec)), y: C + r * Math.sin(angle(sec)) });

function arc(startSec: number, endSec: number, r: number): string {
  const a = pt(startSec, r);
  const b = pt(endSec, r);
  const large = (endSec - startSec) / DAY > 0.5 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} 1 ${b.x} ${b.y}`;
}

function ptDeg(deg: number, r: number) {
  const rad = (deg * Math.PI) / 180;
  return { x: C + r * Math.cos(rad), y: C + r * Math.sin(rad) };
}

function arcDeg(startDeg: number, endDeg: number, r: number): string {
  const a = ptDeg(startDeg, r);
  const b = ptDeg(endDeg, r);
  const large = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  const sweep = endDeg >= startDeg ? 1 : 0;
  return `M ${a.x} ${a.y} A ${r} ${r} 0 ${large} ${sweep} ${b.x} ${b.y}`;
}

function fmtHM(hour: number, minute: number) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

interface Props {
  ranked: ScoredHotspot[];
  /** Accessible description (translated). */
  label: string;
  /** id of the recommended spot (highlighted). */
  bestId: string;
  /** Visual variant (defaults to 'radar'). */
  variant?: DialVariant;
}

export function Dial({ ranked, bestId, label, variant = 'radar' }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Stack spots that share (nearly) the same local time inward so none overlap.
  const stacks = new Map<number, number>();
  const dots = ranked.map((s) => {
    const key = Math.round(s.clock.secondsOfDay / 900); // 15-minute buckets
    const n = stacks.get(key) ?? 0;
    stacks.set(key, n + 1);
    return { s, r: R - n * 13 };
  });

  const activeSpot =
    (selectedId ? dots.find((d) => d.s.hotspot.id === selectedId) : undefined) ??
    dots.find((d) => d.s.hotspot.id === bestId);

  if (variant === 'arc') {
    return (
      <PeakArcDial
        dots={dots}
        bestId={bestId}
        selectedId={selectedId}
        onSelect={(id) => setSelectedId((prev) => (prev === id ? null : id))}
        activeSpot={activeSpot}
        label={label}
      />
    );
  }

  const isRadar = variant === 'radar';
  const hourLabels = [0, 6, 12, 18];

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-auto w-full select-none" role="img" aria-label={label}>
      {isRadar && (
        <defs>
          <filter id="golden-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <radialGradient id="radar-bg" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="var(--color-peak)" stopOpacity="0.06" />
            <stop offset="70%" stopColor="var(--color-deck)" stopOpacity="0.02" />
            <stop offset="100%" stopColor="var(--color-night)" stopOpacity="0" />
          </radialGradient>
        </defs>
      )}

      {/* Radar background & concentric rings */}
      {isRadar && (
        <g>
          <circle cx={C} cy={C} r={R} fill="url(#radar-bg)" />
          <circle cx={C} cy={C} r={R * 0.44} fill="none" stroke="var(--color-rule)" strokeWidth={0.75} strokeDasharray="3 4" />
          <circle cx={C} cy={C} r={R * 0.72} fill="none" stroke="var(--color-rule)" strokeWidth={0.75} strokeDasharray="3 4" />
          {/* Day arc (06:00 -> 18:00) */}
          <path
            d={arc(6 * 3600, 18 * 3600, R + 4)}
            fill="none"
            stroke="var(--color-ink)"
            strokeOpacity={0.12}
            strokeWidth={2}
          />
        </g>
      )}

      {/* track */}
      <circle cx={C} cy={C} r={R} fill="none" stroke="var(--color-rule)" strokeWidth={1} />

      {/* hour ticks */}
      {Array.from({ length: 24 }, (_, h) => {
        const a = pt(h * 3600, R + 8);
        const b = pt(h * 3600, R + (h % 6 === 0 ? 16 : 12));
        return (
          <line
            key={h}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={h % 6 === 0 ? 'var(--color-dim)' : 'var(--color-faint)'}
            strokeWidth={h % 6 === 0 ? 1.5 : 1}
          />
        );
      })}

      {/* peak window 11–20 */}
      <path
        d={arc(WINDOWS.peak.start, WINDOWS.peak.end, R)}
        fill="none"
        stroke="var(--color-peak)"
        strokeOpacity={0.55}
        strokeWidth={6}
        strokeLinecap="butt"
      />
      {/* golden 18–19 */}
      <path
        d={arc(WINDOWS.golden.start, WINDOWS.golden.end, R)}
        fill="none"
        stroke="var(--color-gold)"
        strokeWidth={isRadar ? 10 : 9}
        strokeLinecap="butt"
        filter={isRadar ? 'url(#golden-glow)' : undefined}
      />

      {/* Golden beacon marker at 18:00 */}
      {isRadar &&
        (() => {
          const g18 = pt(WINDOWS.golden.start, R + 17);
          return <circle cx={g18.x} cy={g18.y} r={2.5} fill="var(--color-gold)" />;
        })()}

      {/* hour numerals */}
      {hourLabels.map((h) => {
        const p = pt(h * 3600, R + 30);
        return (
          <text
            key={h}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            className="semi-condensed"
            fontSize={13}
            fontWeight={600}
            fill={h === 18 ? 'var(--color-gold)' : 'var(--color-dim)'}
          >
            {String(h).padStart(2, '0')}
          </text>
        );
      })}

      {/* Center HUD (Radar mode) */}
      {isRadar && activeSpot && (
        <g>
          <text
            x={C}
            y={C - 16}
            textAnchor="middle"
            fontSize={9}
            fontWeight={700}
            letterSpacing="0.12em"
            fill={activeSpot.s.hotspot.id === bestId ? 'var(--color-hot)' : 'var(--color-gold)'}
          >
            {activeSpot.s.hotspot.id === bestId ? 'BEST SPOT' : 'SELECTED'}
          </text>
          <text
            x={C}
            y={C + 2}
            textAnchor="middle"
            className="condensed"
            fontSize={24}
            fontWeight={800}
            fill="var(--color-ink)"
          >
            {fmtHM(activeSpot.s.clock.hour, activeSpot.s.clock.minute)}
          </text>
          <text
            x={C}
            y={C + 20}
            textAnchor="middle"
            fontSize={10.5}
            fontWeight={600}
            fill="var(--color-dim)"
          >
            {activeSpot.s.hotspot.city.length > 14
              ? `${activeSpot.s.hotspot.city.slice(0, 13)}…`
              : activeSpot.s.hotspot.city}
          </text>
        </g>
      )}

      {/* hotspots */}
      {dots.map(({ s, r }) => {
        const isBest = s.hotspot.id === bestId;
        const isSelected = s.hotspot.id === selectedId;
        if (isBest && !isRadar) return null;
        if (isBest) return null;

        const p = pt(s.clock.secondsOfDay, r);
        const fill =
          s.tier === 'golden' ? 'var(--color-gold)' : s.tier === 'peak' ? 'var(--color-peak)' : 'var(--color-faint)';

        return (
          <g
            key={s.hotspot.id}
            className={isRadar ? 'cursor-pointer' : undefined}
            onClick={
              isRadar
                ? () => setSelectedId((prev) => (prev === s.hotspot.id ? null : s.hotspot.id))
                : undefined
            }
          >
            {isSelected && (
              <circle cx={p.x} cy={p.y} r={8.5} fill="none" stroke="var(--color-ink)" strokeWidth={1.5} />
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={isSelected ? 5.5 : 4.5}
              fill={fill}
              stroke="var(--color-night)"
              strokeWidth={2}
            >
              <title>
                {s.hotspot.city}, {fmtHM(s.clock.hour, s.clock.minute)}
              </title>
            </circle>
          </g>
        );
      })}

      {/* recommended spot: hand from the centre to its dot */}
      {(() => {
        const best = dots.find((d) => d.s.hotspot.id === bestId);
        if (!best) return null;
        const p = pt(best.s.clock.secondsOfDay, best.r);
        const startR = isRadar ? 34 : 0;
        const handStart = startR > 0 ? pt(best.s.clock.secondsOfDay, startR) : { x: C, y: C };
        const handEnd = pt(best.s.clock.secondsOfDay, best.r - 12);
        return (
          <g
            className={isRadar ? 'cursor-pointer' : undefined}
            onClick={isRadar ? () => setSelectedId(null) : undefined}
          >
            <line
              x1={handStart.x}
              y1={handStart.y}
              x2={handEnd.x}
              y2={handEnd.y}
              stroke="var(--color-hot)"
              strokeWidth={2}
              strokeOpacity={isRadar ? 0.8 : 1}
            />
            {!isRadar && <circle cx={C} cy={C} r={4} fill="var(--color-hot)" />}
            <circle className="dial-pulse" cx={p.x} cy={p.y} r={7} fill="none" stroke="var(--color-hot)" strokeWidth={2} />
            <circle cx={p.x} cy={p.y} r={7} fill="var(--color-hot)" stroke="var(--color-night)" strokeWidth={2.5}>
              <title>
                {best.s.hotspot.city}, {fmtHM(best.s.clock.hour, best.s.clock.minute)}
              </title>
            </circle>
          </g>
        );
      })()}
    </svg>
  );
}

/**
 * Peak-focused 210° gauge variant (10:00–21:00 zoomed in across the top arc,
 * 18:00 Golden Hour highlighted, off-peak hotspots clustered on the lower quiet arc).
 */
function PeakArcDial({
  dots,
  bestId,
  selectedId,
  onSelect,
  activeSpot,
  label,
}: {
  dots: Array<{ s: ScoredHotspot; r: number }>;
  bestId: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  activeSpot: { s: ScoredHotspot; r: number } | undefined;
  label: string;
}) {
  const ARC_START_SEC = 10 * 3600; // 10:00
  const ARC_END_SEC = 21 * 3600; // 21:00
  const START_DEG = -195;
  const END_DEG = 15; // 210 deg span across top

  const secToDeg = (sec: number) => {
    if (sec >= ARC_START_SEC && sec <= ARC_END_SEC) {
      return START_DEG + ((sec - ARC_START_SEC) / (ARC_END_SEC - ARC_START_SEC)) * (END_DEG - START_DEG);
    }
    // Map off-peak (21:00 -> 10:00) into bottom arc (35 -> 145)
    const offSpan = DAY - (ARC_END_SEC - ARC_START_SEC);
    const elapsed = sec > ARC_END_SEC ? sec - ARC_END_SEC : sec + (DAY - ARC_END_SEC);
    return 35 + (elapsed / offSpan) * 110;
  };

  const arcStacks = new Map<number, number>();
  const positioned = dots.map(({ s }) => {
    const deg = secToDeg(s.clock.secondsOfDay);
    const bucket = Math.round(deg / 6);
    const n = arcStacks.get(bucket) ?? 0;
    arcStacks.set(bucket, n + 1);
    return { s, deg, r: R - n * 12 };
  });

  const hours = [10, 12, 14, 16, 18, 20];

  return (
    <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-auto w-full select-none" role="img" aria-label={label}>
      {/* Active gauge background */}
      <path d={arcDeg(START_DEG, END_DEG, R)} fill="none" stroke="var(--color-rule)" strokeWidth={2} />
      {/* Off-peak quiet arc */}
      <path
        d={arcDeg(35, 145, R)}
        fill="none"
        stroke="var(--color-rule)"
        strokeWidth={1}
        strokeDasharray="3 4"
      />
      <text x={C} y={C + R + 20} textAnchor="middle" fontSize={9.5} fill="var(--color-faint)">
        OFF-PEAK (21–10)
      </text>

      {/* Peak 11:00–20:00 */}
      <path
        d={arcDeg(secToDeg(WINDOWS.peak.start), secToDeg(WINDOWS.peak.end), R)}
        fill="none"
        stroke="var(--color-peak)"
        strokeOpacity={0.55}
        strokeWidth={7}
      />

      {/* Golden 18:00–19:00 */}
      <path
        d={arcDeg(secToDeg(WINDOWS.golden.start), secToDeg(WINDOWS.golden.end), R)}
        fill="none"
        stroke="var(--color-gold)"
        strokeWidth={11}
      />

      {/* Hour ticks & numerals */}
      {hours.map((h) => {
        const d = secToDeg(h * 3600);
        const a = ptDeg(d, R + 8);
        const b = ptDeg(d, R + 15);
        const lbl = ptDeg(d, R + 27);
        return (
          <g key={h}>
            <line
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={h === 18 ? 'var(--color-gold)' : 'var(--color-dim)'}
              strokeWidth={1.5}
            />
            <text
              x={lbl.x}
              y={lbl.y}
              textAnchor="middle"
              dominantBaseline="central"
              className="semi-condensed"
              fontSize={12}
              fontWeight={600}
              fill={h === 18 ? 'var(--color-gold)' : 'var(--color-dim)'}
            >
              {String(h).padStart(2, '0')}
            </text>
          </g>
        );
      })}

      {/* Center readout */}
      {activeSpot && (
        <g>
          <text
            x={C}
            y={C - 16}
            textAnchor="middle"
            fontSize={9}
            fontWeight={700}
            letterSpacing="0.12em"
            fill={activeSpot.s.hotspot.id === bestId ? 'var(--color-hot)' : 'var(--color-gold)'}
          >
            {activeSpot.s.hotspot.id === bestId ? 'PEAK GAUGE' : 'SELECTED'}
          </text>
          <text
            x={C}
            y={C + 4}
            textAnchor="middle"
            className="condensed"
            fontSize={25}
            fontWeight={800}
            fill="var(--color-ink)"
          >
            {fmtHM(activeSpot.s.clock.hour, activeSpot.s.clock.minute)}
          </text>
          <text x={C} y={C + 22} textAnchor="middle" fontSize={10.5} fontWeight={600} fill="var(--color-dim)">
            {activeSpot.s.hotspot.city.length > 14
              ? `${activeSpot.s.hotspot.city.slice(0, 13)}…`
              : activeSpot.s.hotspot.city}
          </text>
        </g>
      )}

      {/* Hotspot dots */}
      {positioned.map(({ s, deg, r }) => {
        const isBest = s.hotspot.id === bestId;
        const isSelected = s.hotspot.id === selectedId;
        const p = ptDeg(deg, r);
        const fill = isBest
          ? 'var(--color-hot)'
          : s.tier === 'golden'
            ? 'var(--color-gold)'
            : s.tier === 'peak'
              ? 'var(--color-peak)'
              : 'var(--color-faint)';

        return (
          <g key={s.hotspot.id} className="cursor-pointer" onClick={() => onSelect(s.hotspot.id)}>
            {isBest && (
              <circle className="dial-pulse" cx={p.x} cy={p.y} r={7} fill="none" stroke="var(--color-hot)" strokeWidth={2} />
            )}
            {isSelected && !isBest && (
              <circle cx={p.x} cy={p.y} r={8.5} fill="none" stroke="var(--color-ink)" strokeWidth={1.5} />
            )}
            <circle
              cx={p.x}
              cy={p.y}
              r={isBest ? 7 : isSelected ? 5.5 : 4.5}
              fill={fill}
              stroke="var(--color-night)"
              strokeWidth={isBest ? 2.5 : 2}
            >
              <title>
                {s.hotspot.city}, {fmtHM(s.clock.hour, s.clock.minute)}
              </title>
            </circle>
          </g>
        );
      })}
    </svg>
  );
}
