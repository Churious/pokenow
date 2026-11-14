import type { ScoredHotspot } from '../types';
import { useI18n } from '../i18n';
import type { Messages } from '../i18n/types';

/** Localized name of the weekly event inside the golden window. */
export function eventName(t: Messages, label: string | null): string {
  if (label === 'Raid Hour') return t.status.raidHour;
  if (label === 'Spotlight Hour') return t.status.spotlightHour;
  return t.status.goldenHour;
}

/** Status of a spot right now: Raid Hour / Spotlight Hour / Golden hour, Peak window, or Quiet. */
export function StatusMark({ scored }: { scored: ScoredHotspot }) {
  const { t } = useI18n();
  if (scored.status === 'raid-hour') {
    return (
      <span className="inline-flex items-center gap-1.5 font-semibold text-gold">
        <span aria-hidden className="size-2 shrink-0 rotate-45 bg-gold" />
        {eventName(t, scored.eventLabel)}
      </span>
    );
  }
  if (scored.status === 'active') {
    return (
      <span className="inline-flex items-center gap-1.5 font-medium text-peak">
        <span aria-hidden className="size-2 shrink-0 rounded-full bg-peak" />
        {t.status.peak}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-dim">
      <span aria-hidden className="size-2 shrink-0 rounded-full border border-faint" />
      {t.status.quiet}
    </span>
  );
}

