import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { Check, ChevronDown, Languages } from 'lucide-react';
import { LANGUAGE_NAMES, LOCALE_CODES, useI18n, type Locale } from '../i18n';

/**
 * Language menu: one button (icon + current language + chevron) opens a
 * styled listbox. Follows the WAI-ARIA "select-only combobox" keyboard model:
 * ↑/↓ move, Home/End jump, Enter/Space choose, Esc closes, typing a letter
 * jumps to the next language starting with it.
 */
export function LanguagePicker() {
  const { locale, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => LOCALE_CODES.indexOf(locale));
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();

  // Close on outside click / focus leaving the widget.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointer);
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  // Keep the highlighted option in view.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [open, active]);

  const openMenu = () => {
    setActive(LOCALE_CODES.indexOf(locale));
    setOpen(true);
  };

  const choose = (code: Locale) => {
    setLocale(code);
    setOpen(false);
    buttonRef.current?.focus();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const last = LOCALE_CODES.length - 1;
    if (!open) {
      if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
        e.preventDefault();
        openMenu();
      }
      return;
    }
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActive((i) => Math.min(last, i + 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
        break;
      case 'Home':
        e.preventDefault();
        setActive(0);
        break;
      case 'End':
        e.preventDefault();
        setActive(last);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        choose(LOCALE_CODES[active]);
        break;
      case 'Escape':
      case 'Tab':
        setOpen(false);
        break;
      default:
        if (e.key.length === 1) {
          const ch = e.key.toLowerCase();
          const order = [...LOCALE_CODES.slice(active + 1), ...LOCALE_CODES.slice(0, active + 1)];
          const hit = order.find((c) => LANGUAGE_NAMES[c].toLowerCase().startsWith(ch));
          if (hit) setActive(LOCALE_CODES.indexOf(hit));
        }
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-opt-${active}` : undefined}
        aria-label={`${t.nav.language}: ${LANGUAGE_NAMES[locale]}`}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={`inline-flex h-9 items-center gap-1.5 rounded-md px-2.5 text-sm ring-1 transition-colors ${
          open ? 'bg-deck text-ink ring-dim' : 'text-dim ring-rule hover:text-ink hover:ring-dim'
        }`}
      >
        <Languages className="size-4 shrink-0" aria-hidden />
        <span className="max-w-[9rem] truncate text-ink">{LANGUAGE_NAMES[locale]}</span>
        <ChevronDown className={`size-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-label={t.nav.language}
          className="absolute right-0 z-50 mt-2 max-h-[min(70vh,26rem)] w-56 overflow-y-auto overscroll-contain rounded-md bg-deck p-1 shadow-[0_12px_32px_rgb(0_0_0/0.45)] ring-1 ring-rule"
        >
          {LOCALE_CODES.map((code, i) => {
            const selected = code === locale;
            const highlighted = i === active;
            return (
              <li
                key={code}
                id={`${id}-opt-${i}`}
                data-index={i}
                role="option"
                aria-selected={selected}
                lang={code}
                onPointerEnter={() => setActive(i)}
                onClick={() => choose(code)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded px-3 py-2 text-sm ${
                  highlighted ? 'bg-rule text-ink' : 'text-dim'
                } ${selected ? 'font-semibold text-ink' : ''}`}
              >
                <span className="truncate">{LANGUAGE_NAMES[code]}</span>
                {selected && <Check className="size-4 shrink-0 text-gold" aria-hidden />}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
