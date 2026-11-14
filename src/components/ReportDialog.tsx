import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { Plus, X } from 'lucide-react';
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

/** Polls until get() returns a non-empty string or the time runs out. */
async function waitFor(get: () => string, ms: number): Promise<string> {
  for (let waited = 0; !get() && waited < ms; waited += 100) await new Promise((r) => setTimeout(r, 100));
  return get();
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

/** Label inside a field box (the box, not the input, carries the border). */
const rowLabel = 'block text-xs font-medium';
const bare = 'w-full resize-none bg-transparent py-1 text-sm placeholder:text-faint/70 focus:outline-none';
const box = 'block rounded-lg bg-deck px-3 pt-2 pb-1 ring-1 ring-rule focus-within:ring-gold/60';

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
  const [noteOpen, setNoteOpen] = useState(false);
  const tokenRef = useRef('');
  tokenRef.current = token;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const widgetRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  const open = useCallback((k: ReportKind) => {
    setKind(k);
    setStatus({ phase: 'idle' });
    setToken('');
    setNoteOpen(false);
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
  const captchaError = t.report.errors.captcha;
  useEffect(() => {
    if (!kind || sent || !widgetRef.current) return;
    let cancelled = false;
    loadTurnstile()
      .then((ts) => {
        if (cancelled || !widgetRef.current || widgetId.current) return;
        widgetId.current = ts.render(widgetRef.current, {
          sitekey: CONFIG.report.turnstileSiteKey,
          theme: 'dark',
          // The check usually passes invisibly; the widget only appears if it needs a click.
          appearance: 'interaction-only',
          language: locale.toLowerCase(),
          callback: (tok: string) => setToken(tok),
          'expired-callback': () => setToken(''),
          'error-callback': () => setToken(''),
        });
      })
      .catch(() => setStatus({ phase: 'error', message: captchaError }));
    return () => {
      cancelled = true;
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [kind, sent, locale, captchaError]);

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!kind) return;
    const data = Object.fromEntries(new FormData(e.currentTarget).entries());
    setStatus({ phase: 'sending' });
    // The invisible check may still be running when the visitor presses Send.
    const token = await waitFor(() => tokenRef.current, 8000);
    if (!token) {
      setStatus({ phase: 'error', message: t.report.errors.captcha });
      return;
    }
    const body =
      kind === 'translation'
        ? { ...data, type: 'translation', language: locale, page: window.location.href.split('#')[0] }
        : { ...data, type: 'hotspot' };
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

  return (
    <ReportContext.Provider value={open}>
      {children}
      {REPORTS_ENABLED && (
        <dialog
          ref={dialogRef}
          onClose={close}
          aria-labelledby="report-title"
          className="m-0 mt-auto w-full max-w-none bg-transparent p-0 text-ink backdrop:bg-black/70 sm:m-auto sm:max-w-md"
        >
          {kind && (
            <div className="max-h-[90dvh] overflow-y-auto rounded-t-xl border-t-2 border-gold bg-night px-5 pt-4 pb-5 sm:rounded-xl sm:border sm:border-rule sm:border-t-gold">
              <div className="flex items-center gap-3">
                <h2 id="report-title" className="semi-condensed text-lg font-bold">
                  {kind === 'translation' ? t.report.translationTitle : t.report.hotspotTitle}
                </h2>
                {kind === 'translation' && (
                  <span className="rounded bg-deck px-1.5 py-0.5 text-xs text-dim" title={t.report.language}>
                    {LANGUAGE_NAMES[locale]}
                  </span>
                )}
                <button
                  type="button"
                  onClick={close}
                  aria-label={t.report.close}
                  className="-m-2 ml-auto p-2 text-dim hover:text-ink"
                >
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
                <form onSubmit={onSubmit} className="mt-4">
                  {/* Honeypot for bots; hidden from people and screen readers. */}
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

                  {kind === 'translation' ? (
                    <div className="divide-y divide-rule rounded-lg bg-deck ring-1 ring-rule focus-within:ring-gold/60">
                      <label className="block px-3 pt-2.5 pb-1">
                        <span className={`${rowLabel} text-faint`}>{t.report.current}</span>
                        <textarea name="current" required maxLength={1000} rows={2} className={`${bare} text-dim`} />
                      </label>
                      <label className="block px-3 pt-2.5 pb-1">
                        <span className={`${rowLabel} text-gold`}>{t.report.suggestion}</span>
                        <textarea name="suggestion" required maxLength={1000} rows={2} className={`${bare} text-ink`} />
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid grid-cols-[2fr_3fr] gap-2">
                        <label className={box}>
                          <span className={`${rowLabel} text-faint`}>{t.report.city}</span>
                          <input name="city" required maxLength={120} placeholder="Seoul" className={`${bare} text-ink`} />
                        </label>
                        <label className={box}>
                          <span className={`${rowLabel} text-faint`}>{t.report.spot}</span>
                          <input name="spot" required maxLength={120} placeholder="City Hall Plaza" className={`${bare} text-ink`} />
                        </label>
                      </div>
                      <label className={box}>
                        <span className={`${rowLabel} text-faint`}>{t.report.coords}</span>
                        <input
                          name="coords"
                          required
                          maxLength={120}
                          inputMode="decimal"
                          placeholder="37.5663, 126.9779"
                          className={`${bare} semi-condensed text-base font-semibold text-ink`}
                        />
                      </label>
                      <label className={box}>
                        <span className={`${rowLabel} text-faint`}>{t.report.source}</span>
                        <input name="source" required maxLength={1000} placeholder={t.report.sourceHint} className={`${bare} text-ink`} />
                      </label>
                    </div>
                  )}

                  {noteOpen ? (
                    <label className={`${box} mt-3`}>
                      <span className={`${rowLabel} text-faint`}>{kind === 'translation' ? t.report.notes : t.report.note}</span>
                      <textarea
                        name={kind === 'translation' ? 'notes' : 'note'}
                        maxLength={1000}
                        rows={2}
                        autoFocus
                        className={`${bare} text-ink`}
                      />
                    </label>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setNoteOpen(true)}
                      className="mt-2 inline-flex items-center gap-1 py-1 text-sm text-dim hover:text-ink"
                    >
                      <Plus className="size-4" aria-hidden />
                      {t.report.addNote}
                    </button>
                  )}

                  <div ref={widgetRef} className="mt-3 empty:hidden" />

                  {status.phase === 'error' && (
                    <p role="alert" className="mt-3 text-sm text-hot">
                      {status.message}
                    </p>
                  )}

                  <div className="mt-4 flex items-center gap-4">
                    <p className="flex-1 text-xs leading-relaxed text-faint">{t.report.publicNote}</p>
                    <button
                      type="submit"
                      disabled={status.phase === 'sending'}
                      className="h-11 shrink-0 rounded-md bg-gold px-5 text-sm font-semibold text-night disabled:opacity-60"
                    >
                      {status.phase === 'sending' ? t.report.sending : t.report.send}
                    </button>
                  </div>
                  <a
                    href={githubFormUrl(kind, locale)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-block text-xs text-faint underline underline-offset-4 hover:text-ink"
                  >
                    {t.report.githubAlt}
                  </a>
                </form>
              )}
            </div>
          )}
        </dialog>
      )}
    </ReportContext.Provider>
  );
}
