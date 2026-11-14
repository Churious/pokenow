/**
 * Minimal i18n runtime: no dependency, type-checked dictionaries.
 *
 * Supported locales = the languages Pokémon GO itself offers in-game.
 * To add or fix a translation, edit `./locales/<code>.ts` — TypeScript will
 * flag any missing key.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Messages } from './types';
import { en } from './locales/en';
import { ko } from './locales/ko';
import { ja } from './locales/ja';
import { zhTW } from './locales/zh-TW';
import { fr } from './locales/fr';
import { de } from './locales/de';
import { it } from './locales/it';
import { es } from './locales/es';
import { es419 } from './locales/es-419';
import { ptBR } from './locales/pt-BR';
import { tr } from './locales/tr';
import { th } from './locales/th';
import { id } from './locales/id';
import { hi } from './locales/hi';

export const LOCALES = {
  en,
  fr,
  de,
  it,
  es,
  'es-419': es419,
  'pt-BR': ptBR,
  tr,
  id,
  ko,
  ja,
  'zh-TW': zhTW,
  th,
  hi,
} as const satisfies Record<string, Messages>;

export type Locale = keyof typeof LOCALES;
export const LOCALE_CODES = Object.keys(LOCALES) as Locale[];

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

function detect(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in LOCALES) return saved as Locale;
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

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detect);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18n>(() => {
    const t = LOCALES[locale];
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
  }, [locale, setLocale]);

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
