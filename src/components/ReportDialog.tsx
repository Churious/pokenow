import { createContext, useCallback, useContext, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';
import { CONFIG, REPORTS_ENABLED } from '../config';
import { issueTemplateUrl } from '../lib/github';
import { LANGUAGE_NAMES, useI18n } from '../i18n';

export type ReportKind = 'translation' | 'hotspot' | 'community';

/** Same options as .github/ISSUE_TEMPLATE/community.yml and PLATFORMS in worker/report-worker.js. */
const PLATFORMS = ['Discord', 'KakaoTalk Open Chat', 'LINE', 'Telegram', 'WhatsApp', 'Other'] as const;

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
  if (kind === 'translation') {
    return issueTemplateUrl('translation.yml', { language: locale, page: window.location.href.split('#')[0] });
  }
  return issueTemplateUrl(kind === 'community' ? 'community.yml' : 'hotspot.yml');
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

/**
 * Fields follow the spot list: no boxes, just a hairline under each one that turns
 * light while typing. No glow or outline ring on click.
 */
const fieldLabel = 'block text-sm text-dim';
const input =
  'mt-1 block w-full resize-none border-b border-rule bg-transparent pb-2 text-base text-ink placeholder:text-faint/60 ' +
  'transition-colors focus:border-ink focus:outline-none focus-visible:outline-none';

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
        : { ...data, type: kind };
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
                : err === 'bad_url'
                  ? t.report.errors.url
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
            <div className="max-h-[92dvh] overflow-y-auto rounded-t-2xl border-t border-rule bg-night px-5 pt-5 pb-6 sm:rounded-2xl sm:border">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="report-title" className="condensed text-3xl leading-none font-bold">
                    {kind === 'translation'
                      ? t.report.translationTitle
                      : kind === 'community'
                        ? t.report.communityTitle
                        : t.report.hotspotTitle}
                  </h2>
                  {kind === 'translation' && <p className="mt-1.5 text-sm text-dim">{LANGUAGE_NAMES[locale]}</p>}
                </div>
                <button
                  type="button"
                  onClick={close}
                  aria-label={t.report.close}
                  className="-m-2 p-2 text-faint hover:text-ink focus-visible:outline-none"
                >
                  <X className="size-5" aria-hidden />
                </button>
              </div>

              {status.phase === 'sent' ? (
                <div className="mt-6">
                  <p className="font-semibold">{t.report.sentTitle}</p>
                  <p className="mt-1 text-sm text-dim">{t.report.sentBody}</p>
                  <button
                    type="button"
                    onClick={close}
                    className="mt-6 h-12 w-full rounded-md bg-ink text-base font-semibold text-night"
                  >
                    {t.report.close}
                  </button>
                </div>
              ) : (
                <form onSubmit={onSubmit} className="mt-6 space-y-5">
                  {/* Honeypot for bots; hidden from people and screen readers. */}
                  <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />

                  {kind === 'translation' ? (
                    <>
                      <label className={fieldLabel}>
                        {t.report.current}
                        <textarea name="current" required maxLength={1000} rows={2} className={input} />
                      </label>
                      <label className={fieldLabel}>
                        {t.report.suggestion}
                        <textarea name="suggestion" required maxLength={1000} rows={2} className={input} />
                      </label>
                    </>
                  ) : kind === 'community' ? (
                    <>
                      <label className={fieldLabel}>
                        {t.report.communityName}
                        <input name="name" required maxLength={120} className={input} />
                      </label>
                      <div className="grid grid-cols-[3fr_2fr] gap-4">
                        <label className={fieldLabel}>
                          {t.report.platform}
                          <span className="relative block">
                            <select
                              name="platform"
                              required
                              defaultValue="Discord"
                              className={`${input} cursor-pointer appearance-none truncate pr-6`}
                            >
                              {PLATFORMS.map((p) => (
                                <option key={p} value={p} className="bg-night">
                                  {p === 'Other' ? t.community.other : p}
                                </option>
                              ))}
                            </select>
                            <ChevronDown
                              className="pointer-events-none absolute top-1/2 right-0 size-4 -translate-y-1/2 text-faint"
                              aria-hidden
                            />
                          </span>
                        </label>
                        <label className={fieldLabel}>
                          {t.report.languages}
                          <input name="languages" required maxLength={120} placeholder={t.report.languagesHint} className={input} />
                        </label>
                      </div>
                      <label className={fieldLabel}>
                        {t.report.inviteUrl}
                        <input
                          name="url"
                          type="url"
                          required
                          maxLength={300}
                          inputMode="url"
                          placeholder="https://discord.gg/…"
                          className={input}
                        />
                        <span className="mt-1 block text-xs text-faint">{t.report.inviteHint}</span>
                      </label>
                      <label className={fieldLabel}>
                        {t.report.communityHotspots}
                        <input
                          name="hotspots"
                          required
                          maxLength={120}
                          placeholder={t.report.communityHotspotsHint}
                          className={input}
                        />
                      </label>
                      <div className="space-y-2 pt-1">
                        <label className="flex items-start gap-2.5 text-sm text-dim">
                          <input type="checkbox" name="ruleNoCheat" required className="mt-0.5 size-4 shrink-0 accent-gold" />
                          {t.report.ruleNoCheat}
                        </label>
                        <label className="flex items-start gap-2.5 text-sm text-dim">
                          <input type="checkbox" name="ruleAdmin" required className="mt-0.5 size-4 shrink-0 accent-gold" />
                          {t.report.ruleAdmin}
                        </label>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="grid grid-cols-[2fr_3fr] gap-4">
                        <label className={fieldLabel}>
                          {t.report.city}
                          <input name="city" required maxLength={120} placeholder="Seoul" className={input} />
                        </label>
                        <label className={fieldLabel}>
                          {t.report.spot}
                          <input name="spot" required maxLength={120} placeholder="City Hall Plaza" className={input} />
                        </label>
                      </div>
                      <label className={fieldLabel}>
                        {t.report.coords}
                        <input
                          name="coords"
                          required
                          maxLength={120}
                          inputMode="decimal"
                          placeholder="37.5663, 126.9779"
                          className={input}
                        />
                      </label>
                      <label className={fieldLabel}>
                        {t.report.source}
                        <input name="source" required maxLength={1000} placeholder={t.report.sourceHint} className={input} />
                      </label>
                    </>
                  )}

                  {noteOpen ? (
                    <label className={fieldLabel}>
                      {kind === 'translation'
                        ? t.report.notes
                        : kind === 'community'
                          ? t.report.description
                          : t.report.note}
                      <textarea
                        name={kind === 'translation' ? 'notes' : kind === 'community' ? 'description' : 'note'}
                        maxLength={kind === 'community' ? 300 : 1000}
                        rows={2}
                        autoFocus
                        className={input}
                      />
                    </label>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setNoteOpen(true)}
                      className="inline-flex items-center gap-1.5 text-sm text-dim underline underline-offset-4 hover:text-ink"
                    >
                      <Plus className="size-4" aria-hidden />
                      {t.report.addNote}
                    </button>
                  )}

                  <div ref={widgetRef} className="empty:hidden" />

                  {status.phase === 'error' && (
                    <p role="alert" className="text-sm text-hot">
                      {status.message}
                    </p>
                  )}

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={status.phase === 'sending'}
                      className="h-12 w-full rounded-md bg-hot text-base font-semibold text-night hover:bg-[#ff7a3a] disabled:opacity-60"
                    >
                      {status.phase === 'sending' ? t.report.sending : t.report.send}
                    </button>
                    <p className="mt-3 text-xs leading-relaxed text-faint">
                      {t.report.publicNote}{' '}
                      <a
                        href={githubFormUrl(kind, locale)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline underline-offset-4 hover:text-ink"
                      >
                        {t.report.githubAlt}
                      </a>
                    </p>
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
