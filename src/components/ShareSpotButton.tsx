import { Share2 } from 'lucide-react';
import type { Hotspot, LocalClock } from '../types';
import { formatCoords } from '../lib/geo';
import { formatClockShort, getUtcOffsetLabel } from '../lib/time';
import { copyText } from '../lib/clipboard';
import { useToast } from './Toast';
import { useI18n } from '../i18n';

/**
 * Shares "place + coordinates + current local time + link" in one tap.
 * Uses the native share sheet where it exists (phones, so KakaoTalk and other
 * chat apps are one tap away) and copies the same text everywhere else.
 */
export function ShareSpotButton({ hotspot, clock, now }: { hotspot: Hotspot; clock: LocalClock; now: Date }) {
  const { t, weekday } = useI18n();
  const toast = useToast();

  const onClick = async () => {
    const url = window.location.href.split('#')[0];
    const localTime = `${weekday(now, hotspot.timeZone)} ${formatClockShort(clock)} (${getUtcOffsetLabel(
      now,
      hotspot.timeZone,
    )})`;
    const text = t.share.text(
      `${hotspot.city}, ${hotspot.spot}`,
      formatCoords(hotspot),
      localTime,
      url,
    );

    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title: `${hotspot.city}, ${hotspot.spot} — PokeNow`, text });
        return;
      } catch (error) {
        // Closing the share sheet is not a failure; fall back to copying for anything else.
        if (error instanceof Error && error.name === 'AbortError') return;
      }
    }

    const ok = await copyText(text);
    toast.show(ok ? t.share.copied : t.share.failed);
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold text-ink ring-1 ring-rule hover:ring-dim active:translate-y-px"
    >
      <Share2 className="size-4" aria-hidden />
      {t.share.button}
    </button>
  );
}
