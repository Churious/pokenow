/**
 * Minimal i18n runtime: no dependency, type-checked dictionaries.
 *
 * Supported locales = the languages Pokémon GO itself offers in-game.
 * To add or fix a translation, edit `./locales/<code>.ts` — TypeScript will
 * flag any missing key.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Messages } from './types';
import { en } from './locales/en';

/**
 * Only English ships in the main bundle (it is the fallback and the footer
 * always shows its disclaimer). Every other language is its own chunk, fetched
 * when it is first needed.
 */
const LOADERS = {
  en: () => Promise.resolve(en),
  fr: () => import('./locales/fr').then((m) => m.fr),
  de: () => import('./locales/de').then((m) => m.de),
  it: () => import('./locales/it').then((m) => m.it),
  es: () => import('./locales/es').then((m) => m.es),
  'es-419': () => import('./locales/es-419').then((m) => m.es419),
  'pt-BR': () => import('./locales/pt-BR').then((m) => m.ptBR),
  tr: () => import('./locales/tr').then((m) => m.tr),
  id: () => import('./locales/id').then((m) => m.id),
  ko: () => import('./locales/ko').then((m) => m.ko),
  ja: () => import('./locales/ja').then((m) => m.ja),
  'zh-TW': () => import('./locales/zh-TW').then((m) => m.zhTW),
  th: () => import('./locales/th').then((m) => m.th),
  hi: () => import('./locales/hi').then((m) => m.hi),
} as const satisfies Record<string, () => Promise<Messages>>;

export type Locale = keyof typeof LOADERS;
export const LOCALE_CODES = Object.keys(LOADERS) as Locale[];

/** Each language's name in itself, for the picker (kept in sync with `languageName` by a test). */
export const LANGUAGE_NAMES: Record<Locale, string> = {
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
  es: 'Español (España)',
  'es-419': 'Español (Latinoamérica)',
  'pt-BR': 'Português (Brasil)',
  tr: 'Türkçe',
  id: 'Bahasa Indonesia',
  ko: '한국어',
  ja: '日本語',
  'zh-TW': '繁體中文',
  th: 'ไทย',
  hi: 'हिन्दी',
};

export const EN = en;

const loaded = new Map<Locale, Messages>([['en', en]]);

/** Loads a locale's dictionary (cached). Falls back to English if the chunk can't be fetched. */
export async function loadMessages(locale: Locale): Promise<Messages> {
  const hit = loaded.get(locale);
  if (hit) return hit;
  try {
    const m = await LOADERS[locale]();
    loaded.set(locale, m);
    return m;
  } catch {
    return en;
  }
}

const STORAGE_KEY = 'pokespot:lang';

/** Picks the best supported locale for a BCP-47 tag ("pt-PT" → pt-BR, "zh-HK" → zh-TW). */
export function matchLocale(tag: string): Locale | null {
  const lower = tag.toLowerCase();
  const exact = LOCALE_CODES.find((c) => c.toLowerCase() === lower);
  if (exact) return exact;
  const base = lower.split('-')[0];
  if (base === 'zh') return lower.includes('hans') || lower === 'zh-cn' || lower === 'zh-sg' ? null : 'zh-TW';
  if (base === 'pt') return 'pt-BR';
  // Spain → es; any other Spanish region (es-MX, es-419, es-AR…) → Latin American Spanish.
  if (base === 'es') return lower === 'es' || lower === 'es-es' ? 'es' : 'es-419';
  return LOCALE_CODES.find((c) => c.toLowerCase().split('-')[0] === base) ?? null;
}

export function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in LOADERS) return saved as Locale;
  } catch {
    /* storage unavailable */
  }
  const prefs = typeof navigator !== 'undefined' ? navigator.languages ?? [navigator.language] : [];
  for (const tag of prefs) {
    const m = tag && matchLocale(tag);
    if (m) return m;
  }
  return 'en';
}

/** "4d 07h" / "3h 07m" / "3시간 07분" / "3時間07分" — seconds only shown under an hour. */
export function formatDurationWith(t: Messages, totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(s / 86400);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const u = t.units;
  const part = (n: number, unit: string, pad: boolean) =>
    `${pad ? String(n).padStart(2, '0') : n}${u.spaced ? ' ' : ''}${unit}`;
  if (days > 0) return [part(days, u.d, false), part(h % 24, u.h, true)].join(u.sep);
  if (h > 0) return [part(h, u.h, false), part(m, u.m, true)].join(u.sep);
  if (m > 0) return [part(m, u.m, false), part(sec, u.s, true)].join(u.sep);
  return part(sec, u.s, false);
}

interface I18n {
  locale: Locale;
  t: Messages;
  setLocale: (l: Locale) => void;
  /** Localized compact duration. */
  dur: (seconds: number) => string;
  /** Localized integer with grouping. */
  num: (n: number) => string;
  /** Short weekday of `date` in `timeZone`, in the UI language. */
  weekday: (date: Date, timeZone: string) => string;
}

const I18nContext = createContext<I18n | null>(null);

const weekdayFormatters = new Map<string, Intl.DateTimeFormat>();

export function I18nProvider({
  children,
  initialLocale,
  initialMessages,
}: {
  children: ReactNode;
  initialLocale: Locale;
  initialMessages: Messages;
}) {
  const [{ locale, messages }, setState] = useState({ locale: initialLocale, messages: initialMessages });
  const requested = useRef(initialLocale);

  const setLocale = useCallback((l: Locale) => {
    requested.current = l;
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    // Keep the current language on screen until the new one has arrived;
    // if the user picks again meanwhile, only the latest choice wins.
    void loadMessages(l).then((m) => {
      if (requested.current === l) setState({ locale: l, messages: m });
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18n>(() => {
    const t = messages;
    const numFmt = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
    return {
      locale,
      t,
      setLocale,
      dur: (s) => formatDurationWith(t, s),
      num: (n) => numFmt.format(n),
      weekday: (date, timeZone) => {
        const key = `${locale}|${timeZone}`;
        let f = weekdayFormatters.get(key);
        if (!f) {
          f = new Intl.DateTimeFormat(locale, { weekday: 'short', timeZone });
          weekdayFormatters.set(key, f);
        }
        return f.format(date);
      },
    };
  }, [locale, messages, setLocale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}

/** Replaces {key} markers in a translated string with React nodes. */
export function rich(text: string, parts: Record<string, ReactNode>): ReactNode[] {
  return text.split(/(\{\w+\})/g).map((chunk, i) => {
    const m = chunk.match(/^\{(\w+)\}$/);
    return m && m[1] in parts ? <span key={i}>{parts[m[1]]}</span> : chunk;
  });
}
