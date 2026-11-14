import type { ScoredHotspot } from '../types';
import { densityGrade } from '../lib/scoring';

/** Status of a spot right now: Raid Hour / Spotlight Hour / Golden hour, Peak window, or Quiet. */
export function StatusMark({ scored }: { scored: ScoredHotspot }) {
  if (scored.status === 'raid-hour') {
    return (
      <span className="inline-flex items-center gap-1.5 font-semibold text-gold">
        <span aria-hidden className="size-2 rotate-45 bg-gold" />
        {scored.eventLabel === 'Golden Time' ? 'Golden hour' : scored.eventLabel}
      </span>
    );
  }
  if (scored.status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-peak">
        <span aria-hidden className="size-2 rounded-full bg-peak" />
        Peak window
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-dim">
      <span aria-hidden className="size-2 rounded-full border border-faint" />
      Quiet
    </span>
  );
}

/** Crowd grade (S/A/B/C) from the community popularity weight. */
export function CrowdGrade({ popularity }: { popularity: number }) {
  const grade = densityGrade(popularity);
  return (
    <span className="text-dim" title={`Community popularity weight ${popularity} of 100`}>
      Crowd <span className={grade === 'S' || grade === 'A' ? 'font-semibold text-ink' : 'text-ink'}>{grade}</span>
    </span>
  );
}
