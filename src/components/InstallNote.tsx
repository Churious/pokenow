import { Download, Share, X } from 'lucide-react';
import { useI18n } from '../i18n';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

/**
 * A slim bar pinned to the top edge inviting phone visitors to install PokeNow as an app (out of the way of
 * the bottom anchor ad and the centred ad-blocker note). The manifest and service worker in
 * vite.config.ts make the site installable; this note only points it out.
 * Chromium: "Install" opens the browser's dialog. iOS Safari: the Share-sheet steps, because it has no
 * install API. PCs and other browsers: nothing. Closing hides it for a month, and it never appears in the
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
      className="fixed inset-x-0 top-0 z-[60] border-b border-rule bg-deck/95 pt-[env(safe-area-inset-top)] shadow-xl shadow-black/50 backdrop-blur motion-safe:animate-[install-in_240ms_ease-out]"
    >
      <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
        <Icon className="size-5 shrink-0 text-gold" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id="install-note-title" className="semi-condensed text-sm leading-snug font-bold text-ink">
            {t.install.title}
          </h2>
          <p className="mt-0.5 text-xs leading-snug text-dim">
            {variant === 'prompt' ? t.install.body : t.install.iosBody}
          </p>
        </div>
        {variant === 'prompt' && (
          <button
            type="button"
            onClick={install}
            className="h-9 shrink-0 rounded-md bg-gold px-3 text-sm font-semibold text-night"
          >
            {t.install.install}
          </button>
        )}
        <button
          type="button"
          onClick={dismiss}
          aria-label={t.install.close}
          className="-mr-2 shrink-0 p-2 text-faint hover:text-ink"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
    </aside>
  );
}
