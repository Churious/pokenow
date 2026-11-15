import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Check, ExternalLink, KeyRound, ShieldCheck, X } from 'lucide-react';
import { CONFIG } from '../config';
import { useI18n } from '../i18n';
import { usePro } from '../hooks/usePro';
import { loadTurnstile } from '../lib/turnstile';

/**
 * Modal dialog for activating or managing a PokeNow Pro license (max 3 devices,
 * max 2 swaps / 30 days enforced by the Cloudflare Worker + Lemon Squeezy).
 */
export function ProDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t, locale } = useI18n();
  const { isPro, state, busy, error, clearError, activate, deactivate } = usePro();
  const [keyInput, setKeyInput] = useState('');
  const [tsToken, setTsToken] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    const el = dialogRef.current;
    if (!el) return;
    if (open && !el.open) {
      clearError();
      el.showModal();
    } else if (!open && el.open) {
      el.close();
    }
  }, [open, clearError]);

  useEffect(() => {
    if (!open || isPro || !CONFIG.report.turnstileSiteKey) return;
    let cancelled = false;
    loadTurnstile()
      .then((ts) => {
        if (cancelled || !widgetRef.current || widgetId.current) return;
        widgetId.current = ts.render(widgetRef.current, {
          sitekey: CONFIG.report.turnstileSiteKey,
          theme: 'dark',
          appearance: 'interaction-only',
          language: locale,
          callback: (tok: string) => setTsToken(tok),
          'expired-callback': () => setTsToken(''),
        });
      })
      .catch(() => {
        /* Handled on submit */
      });
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
      setTsToken('');
    };
  }, [open, isPro, locale]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim() || busy) return;
    const ok = await activate(keyInput, tsToken);
    if (ok) {
      setKeyInput('');
      onClose();
    } else if (widgetId.current && window.turnstile) {
      setTsToken('');
      window.turnstile.reset(widgetId.current);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-xl border border-rule bg-night p-6 text-ink shadow-2xl backdrop:bg-black/75"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <KeyRound className="size-5 text-gold" aria-hidden />
          <h2 className="semi-condensed text-xl font-bold text-ink">{t.pro.title}</h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.report.close}
          className="-mr-2 -mt-1 grid size-9 place-items-center rounded-full text-dim hover:text-ink"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <p className="mt-2 text-sm text-dim">{t.pro.subtitle}</p>

      <ul className="mt-4 space-y-2 text-sm text-ink">
        {t.pro.benefits.map((b) => (
          <li key={b} className="flex items-start gap-2">
            <Check className="mt-0.5 size-4 shrink-0 text-gold" aria-hidden />
            <span>{b}</span>
          </li>
        ))}
      </ul>

      {isPro && state ? (
        <div className="mt-5 rounded-lg border border-rule bg-white/5 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gold">
            <ShieldCheck className="size-4" aria-hidden />
            <span>{t.pro.activeBadge}</span>
          </div>
          <p className="mt-1 text-xs text-dim">
            {t.pro.deviceInfo(state.keyHint, state.swapsRemaining ?? 2)}
          </p>
          {error && <p className="mt-2 text-xs text-red-400">{t.pro.errors[error]}</p>}
          <button
            type="button"
            disabled={busy}
            onClick={() => void deactivate()}
            className="mt-3 inline-flex h-9 items-center rounded-md px-3 text-xs font-semibold text-dim ring-1 ring-rule hover:text-ink disabled:opacity-50"
          >
            {busy ? t.pro.deactivating : t.pro.deactivate}
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-5 space-y-3">
          <div>
            <label htmlFor="pro-license-key" className="block text-xs font-medium text-dim">
              {t.pro.keyLabel}
            </label>
            <input
              id="pro-license-key"
              type="text"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              placeholder={t.pro.keyPlaceholder}
              autoComplete="off"
              className="mt-1 w-full rounded-md border border-rule bg-black/30 px-3 py-2 text-sm text-ink placeholder:text-faint focus:border-gold focus:outline-none"
            />
          </div>

          {CONFIG.report.turnstileSiteKey && <div ref={widgetRef} />}

          {error && <p className="text-xs text-red-400">{t.pro.errors[error]}</p>}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="submit"
              disabled={busy || !keyInput.trim() || (Boolean(CONFIG.report.turnstileSiteKey) && !tsToken)}
              className="inline-flex h-10 items-center rounded-md bg-ink px-4 text-sm font-semibold text-night hover:bg-white disabled:opacity-50"
            >
              {busy ? t.pro.activating : t.pro.activate}
            </button>

            {CONFIG.pro.checkoutUrl && (
              <a
                href={CONFIG.pro.checkoutUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center gap-1.5 text-sm font-medium text-gold underline underline-offset-4 hover:text-white"
              >
                {t.pro.buy}
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            )}
          </div>
        </form>
      )}
    </dialog>
  );
}
