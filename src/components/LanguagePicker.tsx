import { Languages } from 'lucide-react';
import { LOCALES, LOCALE_CODES, useI18n, type Locale } from '../i18n';

/** Native <select> keeps this accessible and familiar on every phone. */
export function LanguagePicker() {
  const { locale, setLocale, t } = useI18n();
  return (
    <label className="relative inline-flex h-9 items-center gap-1.5 rounded-md px-2 text-sm text-dim ring-1 ring-rule focus-within:ring-gold hover:text-ink">
      <Languages className="size-4 shrink-0" aria-hidden />
      <span className="sr-only">{t.nav.language}</span>
      <select
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        className="max-w-[7.5rem] appearance-none bg-transparent pr-1 text-ink focus:outline-none"
      >
        {LOCALE_CODES.map((code) => (
          <option key={code} value={code} className="bg-deck">
            {LOCALES[code].languageName}
          </option>
        ))}
      </select>
    </label>
  );
}
