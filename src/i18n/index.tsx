/**
 * Minimal i18n runtime: no dependency, type-checked dictionaries.
 *
 * Supported locales = the languages Pokémon GO itself offers in-game.
 * To add or fix a translation, edit `./locales/<code>.ts` — TypeScript will
 * flag any missing key.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Messages } from './types';
import { STORAGE_KEY, loadMessages, type Locale } from './load';

export * from './load';


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
