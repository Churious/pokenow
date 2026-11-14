import { useRef, type KeyboardEvent } from 'react';

export interface TabDef<K extends string> {
  key: K;
  label: string;
  /** Extra classes on the tab button, e.g. "lg:hidden" for a phone-only tab. */
  className?: string;
}

/**
 * Sticky, scrollable tab strip (WAI-ARIA tabs: arrow keys, Home/End).
 * Panels use id `panel-<key>` and are rendered by the parent.
 */
export function TabBar<K extends string>({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: TabDef<K>[];
  active: K;
  onChange: (key: K) => void;
  label: string;
}) {
  const refs = useRef(new Map<K, HTMLButtonElement>());

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    // Only tabs that are actually displayed (a phone-only tab is hidden on desktop).
    const visible = tabs.filter((t) => refs.current.get(t.key)?.offsetParent !== null);
    const i = visible.findIndex((t) => t.key === active);
    let next: number | null = null;
    if (e.key === 'ArrowRight') next = (i + 1) % visible.length;
    else if (e.key === 'ArrowLeft') next = (i - 1 + visible.length) % visible.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = visible.length - 1;
    if (next === null) return;
    e.preventDefault();
    const key = visible[next].key;
    onChange(key);
    refs.current.get(key)?.focus();
  };

  return (
    <div className="sticky top-0 z-20 -mx-4 border-b border-rule bg-night/95 px-4 backdrop-blur lg:-mx-0 lg:px-0">
      <div role="tablist" aria-label={label} onKeyDown={onKeyDown} className="-mx-1 flex gap-1 overflow-x-auto">
        {tabs.map((tab) => {
          const on = tab.key === active;
          return (
            <button
              key={tab.key}
              ref={(el) => {
                if (el) refs.current.set(tab.key, el);
                else refs.current.delete(tab.key);
              }}
              id={`tab-${tab.key}`}
              role="tab"
              type="button"
              aria-selected={on}
              aria-controls={`panel-${tab.key}`}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(tab.key)}
              className={`h-12 shrink-0 border-b-2 px-3 text-sm whitespace-nowrap ${
                on ? 'border-gold font-semibold text-ink' : 'border-transparent text-dim hover:text-ink'
              } ${tab.className ?? ''}`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
