import { useEffect, useRef, useState } from 'react';
import { Heart, X } from 'lucide-react';
import { CONFIG } from '../config';
import { useI18n } from '../i18n';
import { useAdBlocked } from '../hooks/useAdBlocked';
import { SUPPORT_NOTE_KEY, WAS_BLOCKED_KEY, isBlocked, supportOutcome, type SupportOutcome } from '../lib/adblock';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function write(key: string, value: string | null) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* private mode: the note still works for this visit */
  }
}

/**
 * Asks visitors with an ad blocker to allow ads on PokeNow, and says thanks on the first visit after they did.
 * A centred native <dialog> so it isn't missed, but always one tap to dismiss (X, "Maybe later", Esc or the
 * backdrop); "Maybe later" / close hides it for a week. Only with AdSense configured (hooks/useAdBlocked.ts).
 * Icons are SVG, not emoji: some systems (e.g. Linux without an emoji font) show emoji as blank boxes.
 * Class names avoid "ad" words so cosmetic filters don't hide the card itself.
 */
export function SupportNote() {
  const { t } = useI18n();
  const signals = useAdBlocked(400);
  const blocked = isBlocked(signals);
  const debug = typeof location !== 'undefined' && new URLSearchParams(location.search).has('adcheck');
  const [mode, setMode] = useState<SupportOutcome>('none');
  const [howOpen, setHowOpen] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Decide once the check has finished.
  useEffect(() => {
    if (!signals) return;
    const outcome = supportOutcome(blocked, read(WAS_BLOCKED_KEY) === '1', read(SUPPORT_NOTE_KEY), Date.now());
    if (blocked) write(WAS_BLOCKED_KEY, '1');
    if (outcome === 'thanks') write(WAS_BLOCKED_KEY, null);
    setMode(outcome);
  }, [signals, blocked]);

  useEffect(() => {
    const d = dialogRef.current;
    if (d && mode !== 'none' && !d.open) d.showModal();
  }, [mode]);

  const close = () => {
    if (mode === 'ask') write(SUPPORT_NOTE_KEY, String(Date.now()));
    dialogRef.current?.close();
    setMode('none');
  };

  // ?adcheck: show the raw check result on screen (for phones without a console). Developer-only, not translated.
  const debugBox = debug && (
    <pre className="fixed top-2 left-2 z-[70] rounded bg-black/90 p-2 text-[11px] leading-tight text-white">
      {signals
        ? `adcheck  blocked=${blocked}\nnetwork=${signals.network}\ncosmetic=${signals.cosmetic}\nscript=${signals.script}\nloader=${window.__pokenowAds ?? 'none'}`
        : CONFIG.adsense.client
          ? 'adcheck  running…'
          : 'adcheck  AdSense not configured'}
    </pre>
  );

  return (
    <>
      {debugBox}
      {mode !== 'none' && (
        <dialog
          ref={dialogRef}
          onClose={close}
          onClick={(e) => e.target === e.currentTarget && close()}
          aria-labelledby="support-note-title"
          className="m-auto w-[calc(100%-2rem)] max-w-sm rounded-2xl border border-rule bg-night p-0 text-ink shadow-2xl shadow-black/60 backdrop:bg-black/60 motion-safe:animate-[support-in_300ms_ease-out]"
        >
          <div className="p-6">
            <div className="flex items-start justify-between gap-3">
              <Heart
                className={`size-7 shrink-0 ${mode === 'thanks' ? 'fill-hot text-hot' : 'text-gold'}`}
                aria-hidden
              />
              <button
                type="button"
                onClick={close}
                aria-label={t.support.close}
                className="-m-2 p-2 text-faint hover:text-ink focus-visible:outline-none"
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            {mode === 'thanks' ? (
              <>
                <h2 id="support-note-title" className="semi-condensed mt-3 text-2xl leading-snug font-bold">
                  {t.support.thanksTitle}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-dim">{t.support.thanksBody}</p>
                <button
                  type="button"
                  onClick={close}
                  autoFocus
                  className="mt-5 h-11 w-full rounded-md bg-ink text-sm font-semibold text-night"
                >
                  {t.support.close}
                </button>
              </>
            ) : (
              <>
                <h2 id="support-note-title" className="semi-condensed mt-3 text-xl leading-snug font-bold">
                  {t.support.title}
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-dim">{t.support.body}</p>

                {howOpen && (
                  <ul className="mt-4 space-y-1.5 border-t border-rule pt-4 text-sm text-ink">
                    <li>{t.support.steps.ublock}</li>
                    <li>{t.support.steps.adguard}</li>
                    <li>{t.support.steps.other}</li>
                  </ul>
                )}

                <div className="mt-5 flex flex-col gap-2">
                  {!howOpen && (
                    <button
                      type="button"
                      onClick={() => setHowOpen(true)}
                      autoFocus
                      className="h-11 rounded-md bg-gold text-sm font-semibold text-night"
                    >
                      {t.support.how}
                    </button>
                  )}
                  <button type="button" onClick={close} className="h-10 text-sm text-dim hover:text-ink">
                    {t.support.later}
                  </button>
                </div>
              </>
            )}
          </div>
        </dialog>
      )}
    </>
  );
}
