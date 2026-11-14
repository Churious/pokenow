import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { CONFIG, REPORTS_ENABLED } from '../config';
import { issueTemplateUrl } from '../lib/github';
import { LANGUAGE_NAMES, useI18n } from '../i18n';

export type ReportKind = 'translation' | 'hotspot';

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
let turnstileLoading: Promise<TurnstileApi> | null = null;

/** Loads Cloudflare Turnstile once, only when a form is opened. */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  turnstileLoading ??= new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = TURNSTILE_SRC;
    s.async = true;
    s.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')));
    s.onerror = () => {
      turnstileLoading = null;
      reject(new Error('turnstile'));
    };
    document.head.appendChild(s);
  });
  return turnstileLoading;
}

const ReportContext = createContext<(kind: ReportKind) => void>(() => {});

/** GitHub issue form for the same report (people with an account, or reports not configured). */
function githubFormUrl(kind: ReportKind, locale: string): string {
  return kind === 'translation'
    ? issueTemplateUrl('translation.yml', { language: locale, page: window.location.href.split('#')[0] })
    : issueTemplateUrl('hotspot.yml');
}

/**
 * A link that opens the in-site report form, or the GitHub issue form when the
 * report Worker isn't configured (forks, local dev).
 */
export function ReportLink({ kind, className, children }: { kind: ReportKind; className?: string; children: ReactNode }) {
  const open = useContext(ReportContext);
  const { locale } = useI18n();
  if (!REPORTS_ENABLED) {
    return (
      <a href={githubFormUrl(kind, locale)} target="_blank" rel="noopener noreferrer" className={className}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={() => open(kind)} className={className}>
      {children}
    </button>
  );
}

type Status = { phase: 'idle' } | { phase: 'sending' } | { phase: 'sent' } | { phase: 'error'; message: string };

const field =
  'mt-1 w-full rounded-md bg-deck px-3 py-2 text-sm text-ink ring-1 ring-rule placeholder:text-faint focus:ring-gold focus:outline-none';
const label = 'block text-sm font-medium text-ink';

/**
 * Report forms for visitors without a GitHub account. Submissions go to the
 * report Worker (worker/report-worker.js), which checks Cloudflare Turnstile and
 * opens a public GitHub issue. Turnstile is only loaded when a form opens.
 */
export function ReportProvider({ children }: { children: ReactNode }) {
  const { t, locale } = useI18n();
  const [kind, setKind] = useState<ReportKind | null>(null);
  const [status, setStatus] = useState<Status>({ phase: 'idle' });
  const [token, setToken] = useState('');
  const dialogRef = useRef<HTMLDialogElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  const open = useCallback((k: ReportKind) => {
    setKind(k);
    setStatus({ phase: 'idle' });
    setToken('');
  }, []);

  const close = useCallback(() => setKind(null), []);

  // Show/hide the native modal dialog.
  useEffect(() => {
    const d = dialogRef.current;
    if (!d) return;
    if (kind && !d.open) d.showModal();
    if (!kind && d.open) d.close();
  }, [kind]);

  // Render the Turnstile widget while the form is visible (not again on every status change).
  const sent = status.phase === 'sent';
  const networkError = t.report.errors.network;
  useEffect(() => {
    if (!kind || sent || !widgetRef.current) return;
    let cancelled = false;
    loadTurnstile()
      .then((ts) => {
        if (cancelled || !widgetRef.current || widgetId.current) return;
        widgetId.current = ts.render(widgetRef.current, {
          sitekey: CONFIG.report.turnstileSiteKey,
          theme: 'dark',
          language: locale.toLowerCase(),
          callback: (tok: string) => setToken(tok),
          'expired-callback': () => setToken(''),
          'error-callback': () => setToken(''),
        });
      })
      .catch(() => setStatus({ phase: 'error', message: networkError }));
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [kind, sent, locale, networkError]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!kind) return;
    if (!token) {
      setStatus({ phase: 'error', message: t.report.errors.captcha });
      return;
    }
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    const body =
      kind === 'translation'
        ? { ...data, type: 'translation', language: locale, page: window.location.href.split('#')[0] }
        : { ...data, type: 'hotspot' };
    setStatus({ phase: 'sending' });
    try {
      const r = await fetch(`${CONFIG.report.url.replace(/\/$/, '')}/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...body, turnstileToken: token }),
      });
      if (r.ok) {
        setStatus({ phase: 'sent' });
        return;
      }
      const err = ((await r.json().catch(() => ({}))) as { error?: string }).error;
      const msg =
        err === 'captcha'
          ? t.report.errors.captcha
          : err === 'missing_fields'
            ? t.report.errors.missing
            : err === 'bad_coords'
              ? t.report.errors.coords
              : err === 'too_long'
                ? t.report.errors.tooLong
                : t.report.errors.generic;
      setStatus({ phase: 'error', message: msg });
    } catch {
      setStatus({ phase: 'error', message: t.report.errors.network });
    }
    // A Turnstile token is single-use.
    setToken('');
    if (widgetId.current && window.turnstile) window.turnstile.reset(widgetId.current);
  };

  const opt = <span className="font-normal text-faint"> ({t.report.optional})</span>;

  return (
    <ReportContext.Provider value={open}>
      {children}
      {REPORTS_ENABLED && (
        <dialog
          ref={dialogRef}
          onClose={close}
          aria-labelledby="report-title"
          className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-lg bg-night p-0 text-ink ring-1 ring-rule backdrop:bg-black/70"
        >
          {kind && (
            <div className="max-h-[85vh] overflow-y-auto p-5">
              <div className="flex items-start justify-between gap-4">
                <h2 id="report-title" className="semi-condensed text-xl font-bold">
                  {kind === 'translation' ? t.report.translationTitle : t.report.hotspotTitle}
                </h2>
                <button type="button" onClick={close} aria-label={t.report.close} className="-m-2 p-2 text-dim hover:text-ink">
                  <X className="size-5" aria-hidden />
                </button>
              </div>

              {status.phase === 'sent' ? (
                <div className="mt-4">
                  <p className="font-semibold">{t.report.sentTitle}</p>
                  <p className="mt-1 text-sm text-dim">{t.report.sentBody}</p>
                  <button
                    type="button"
                    onClick={close}
                    className="mt-5 h-11 rounded-md bg-ink px-5 text-sm font-semibold text-night"
                  >
                    {t.report.close}
                  </button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="mt-3 space-y-4">
                  <p className="text-xs leading-relaxed text-faint">{t.report.publicNote}</p>
                  {/* Honeypot for bots; hidden from people and screen readers. */}
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

                  {kind === 'translation' ? (
                    <>
                      <p className="text-sm text-dim">
                        {t.report.language}: <span className="text-ink">{LANGUAGE_NAMES[locale]}</span>
                      </p>
                      <label className={label}>
                        {t.report.current}
                        <textarea name="current" required maxLength={1000} rows={2} className={field} />
                      </label>
                      <label className={label}>
                        {t.report.suggestion}
                        <textarea name="suggestion" required maxLength={1000} rows={2} className={field} />
                      </label>
                      <label className={label}>
                        {t.report.notes}
                        {opt}
                        <textarea name="notes" maxLength={1000} rows={2} className={field} />
                      </label>
                    </>
                  ) : (
                    <>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className={label}>
                          {t.report.city}
                          <input name="city" required maxLength={120} className={field} />
                        </label>
                        <label className={label}>
                          {t.report.spot}
                          <input name="spot" required maxLength={120} className={field} />
                        </label>
                      </div>
                      <label className={label}>
                        {t.report.coords}
                        <input
                          name="coords"
                          required
                          maxLength={120}
                          inputMode="decimal"
                          placeholder="37.5720, 126.9769"
                          className={field}
                        />
                        <span className="mt-1 block text-xs font-normal text-faint">{t.report.coordsHint}</span>
                      </label>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <label className={label}>
                          {t.report.country}
                          {opt}
                          <input name="country" maxLength={2} placeholder="KR" className={`${field} uppercase`} />
                        </label>
                        <label className={label}>
                          {t.report.region}
                          {opt}
                          <select name="region" defaultValue="" className={field}>
                            <option value="" />
                            <option value="Asia-Pacific">{t.list.regions['Asia-Pacific']}</option>
                            <option value="Europe & Middle East">{t.list.regions['Europe & Middle East']}</option>
                            <option value="Americas">{t.list.regions.Americas}</option>
                          </select>
                        </label>
                      </div>
                      <label className={label}>
                        {t.report.source}
                        <input name="source" required maxLength={1000} className={field} />
                        <span className="mt-1 block text-xs font-normal text-faint">{t.report.sourceHint}</span>
                      </label>
                      <label className={label}>
                        {t.report.note}
                        {opt}
                        <textarea name="note" maxLength={1000} rows={2} className={field} />
                      </label>
                    </>
                  )}

                  <div ref={widgetRef} className="min-h-[65px]" />

                  {status.phase === 'error' && (
                    <p role="alert" className="text-sm text-hot">
                      {status.message}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                    <a
                      href={githubFormUrl(kind, locale)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-faint underline underline-offset-4 hover:text-ink"
                    >
                      {t.report.githubAlt}
                    </a>
                    <button
                      type="submit"
                      disabled={status.phase === 'sending'}
                      className="h-11 rounded-md bg-hot px-5 text-sm font-semibold text-night disabled:opacity-60"
                    >
                      {status.phase === 'sending' ? t.report.sending : t.report.send}
                    </button>
                  </div>
                </form>
              )}
            </div>
          )}
        </dialog>
      )}
    </ReportContext.Provider>
  );
}
