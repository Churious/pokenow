/**
 * Language loading without React, so the tiny entry chunk (src/main.tsx) can
 * start fetching the visitor's dictionary in parallel with the app bundle.
 */
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

export const STORAGE_KEY = 'pokenow:lang';

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
