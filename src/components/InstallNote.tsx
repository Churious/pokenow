import { Download, Share, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

/**
 * Bottom-of-screen invitation to install PokeNow as an app. The manifest and service worker in
 * vite.config.ts make the site installable; this note only points it out.
 * Chromium: "Install" opens the browser's dialog. iOS Safari: the Share-sheet steps, because it has no
 * install API. Everywhere else: nothing. Closing hides it for a month, and it never appears in the
 * installed app (hooks/useInstallPrompt.ts, lib/install.ts).
 * Icons are SVG, not emoji: some systems without an emoji font show boxes.
 */
export function InstallNote() {
  const { t } = useI18n();
  const { variant, install, dismiss } = useInstallPrompt();
  if (!variant) return null;

  const Icon = variant === 'prompt' ? Download : Share;

  return (
    <aside
      aria-labelledby="install-note-title"
      className="fixed inset-x-4 bottom-28 z-50 mx-auto max-w-sm rounded-2xl border border-rule bg-deck p-4 shadow-2xl shadow-black/60 motion-safe:animate-[support-in_240ms_ease-out] md:bottom-8"
    >
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 size-5 shrink-0 text-gold" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id="install-note-title" className="semi-condensed text-base leading-snug font-bold text-ink">
            {t.install.title}
          </h2>
          <p className="mt-1 text-sm leading-relaxed text-dim">
            {variant === 'prompt' ? t.install.body : t.install.iosBody}
          </p>
          {variant === 'prompt' && (
            <div className="mt-3 flex items-center gap-2">
              <button
                type="button"
                onClick={install}
                className="h-9 rounded-md bg-gold px-3 text-sm font-semibold text-night"
              >
                {t.install.install}
              </button>
              <button type="button" onClick={dismiss} className="h-9 px-2 text-sm text-dim hover:text-ink">
                {t.install.later}
              </button>
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t.install.close}
          className="-m-2 p-2 text-faint hover:text-ink"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </aside>
  );
}
