import { useEffect, useState } from 'react';

/**
 * Tracks a CSS media query. Used to *mount* breakpoint-specific ad units only
 * where they are visible: AdSense errors on slots inside display:none
 * containers, so hiding with CSS alone isn't enough.
 */
export function useMediaQuery(query: string): boolean {
  const get = () => (typeof window !== 'undefined' && 'matchMedia' in window ? window.matchMedia(query).matches : false);
  const [matches, setMatches] = useState(get);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return matches;
}

/** Tailwind breakpoints used for layout switches. */
export const MQ = {
  md: '(min-width: 48rem)',
  lg: '(min-width: 64rem)',
} as const;
