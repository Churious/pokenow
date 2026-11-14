import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useI18n } from '../i18n';
import { useAdBlocked } from '../hooks/useAdBlocked';
import { SUPPORT_NOTE_KEY, shouldShowSupportNote } from '../lib/adblock';

function readClosedAt(): string | null {
  try {
    return localStorage.getItem(SUPPORT_NOTE_KEY);
  } catch {
    return null;
  }
}

/**
 * A small, polite card asking visitors with an ad blocker to allow ads on PokeNow. Never blocks the page:
 * no overlay, no focus trap, appears right after the page opens, and "Maybe later" / close hides it for a week.
 * Only rendered when AdSense is configured and a blocker is detected (hooks/useAdBlocked.ts).
 * Class names avoid "ad" words so cosmetic filters don't hide the card itself.
 */
export function SupportNote() {
  const { t } = useI18n();
  const blocked = useAdBlocked(400);
  const [visible, setVisible] = useState(false);
  const [howOpen, setHowOpen] = useState(false);

  // Shown as soon as the check finishes on entry (no extra wait).
  useEffect(() => {
    if (blocked && shouldShowSupportNote(readClosedAt(), Date.now())) setVisible(true);
  }, [blocked]);

  if (!visible) return null;

  const close = () => {
    setVisible(false);
    try {
      localStorage.setItem(SUPPORT_NOTE_KEY, String(Date.now()));
    } catch {
      /* private mode: closing still works for this visit */
    }
  };

  return (
    <section
      aria-labelledby="support-note-title"
      className="fixed inset-x-3 bottom-3 z-[55] rounded-2xl border border-rule bg-night p-5 shadow-2xl shadow-black/60 sm:inset-x-auto sm:right-5 sm:bottom-5 sm:w-96 motion-safe:animate-[support-in_400ms_ease-out]"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 id="support-note-title" className="semi-condensed text-lg leading-snug font-bold">
          {t.support.title}
        </h2>
        <button
          type="button"
          onClick={close}
          aria-label={t.report.close}
          className="-m-2 p-2 text-faint hover:text-ink focus-visible:outline-none"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-dim">{t.support.body}</p>

      {howOpen && (
        <ul className="mt-3 space-y-1.5 border-t border-rule pt-3 text-sm text-ink">
          <li>{t.support.steps.ublock}</li>
          <li>{t.support.steps.adguard}</li>
          <li>{t.support.steps.other}</li>
        </ul>
      )}

      <div className="mt-4 flex items-center gap-3">
        {!howOpen && (
          <button
            type="button"
            onClick={() => setHowOpen(true)}
            className="h-10 rounded-md bg-gold px-4 text-sm font-semibold text-night"
          >
            {t.support.how}
          </button>
        )}
        <button type="button" onClick={close} className="h-10 px-2 text-sm text-dim underline underline-offset-4 hover:text-ink">
          {t.support.later}
        </button>
      </div>
    </section>
  );
}
