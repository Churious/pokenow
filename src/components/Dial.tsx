import type { ScoredHotspot } from '../types';
import { WINDOWS } from '../lib/scoring';

/**
 * The 24-hour dial: midnight at the top, noon at the bottom, clockwise.
 * Every hotspot is a dot at its current LOCAL time, so the whole planet's
 * raid situation is readable at a glance — dots inside the amber arc are in
 * golden hour, dots inside the green band are in the peak window.
 * Dots move around the dial as time passes.
 */

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

interface Props {
  ranked: ScoredHotspot[];
  /** id of the recommended spot (highlighted). */
  bestId: string;
}

export function Dial({ ranked, bestId }: Props) {
  // Stack spots that share (nearly) the same local time inward so none overlap.
  const stacks = new Map<number, number>();
  const dots = ranked.map((s) => {
    const key = Math.round(s.clock.secondsOfDay / 900); // 15-minute buckets
    const n = stacks.get(key) ?? 0;
    stacks.set(key, n + 1);
    return { s, r: R - n * 13 };
  });
  const best = dots.find((d) => d.s.hotspot.id === bestId);

  const hourLabels = [0, 6, 12, 18];

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      className="h-auto w-full max-w-[340px]"
      role="img"
      aria-label="24-hour dial showing the local time of every hotspot"
    >
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
        strokeWidth={9}
        strokeLinecap="butt"
      />

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

      {/* hotspots */}
      {dots.map(({ s, r }) => {
        if (s.hotspot.id === bestId) return null;
        const p = pt(s.clock.secondsOfDay, r);
        const fill =
          s.tier === 'golden' ? 'var(--color-gold)' : s.tier === 'peak' ? 'var(--color-peak)' : 'var(--color-faint)';
        return (
          <circle key={s.hotspot.id} cx={p.x} cy={p.y} r={4.5} fill={fill} stroke="var(--color-night)" strokeWidth={2}>
            <title>
              {s.hotspot.city}, {String(s.clock.hour).padStart(2, '0')}:{String(s.clock.minute).padStart(2, '0')}
            </title>
          </circle>
        );
      })}

      {/* recommended spot: hand from the centre to its dot (name is shown next to the dial) */}
      {best &&
        (() => {
          const p = pt(best.s.clock.secondsOfDay, best.r);
          const hand = pt(best.s.clock.secondsOfDay, best.r - 12);
          return (
            <g>
              <line x1={C} y1={C} x2={hand.x} y2={hand.y} stroke="var(--color-hot)" strokeWidth={2} />
              <circle cx={C} cy={C} r={4} fill="var(--color-hot)" />
              <circle className="dial-pulse" cx={p.x} cy={p.y} r={7} fill="none" stroke="var(--color-hot)" strokeWidth={2} />
              <circle cx={p.x} cy={p.y} r={7} fill="var(--color-hot)" stroke="var(--color-night)" strokeWidth={2.5} />
            </g>
          );
        })()}
    </svg>
  );
}
