import { Clock, Radar } from 'lucide-react';

/**
 * PokeNow mark: Lucide `Radar` with a small `Clock` notch.
 * Built only from generic ISC-licensed Lucide icons — no ball or creature shapes.
 */
export function Logo() {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative inline-flex">
        <Radar className="size-6 text-peak" strokeWidth={2} aria-hidden />
        <Clock
          className="absolute -right-1.5 -bottom-1 size-3.5 rounded-full bg-night text-gold"
          strokeWidth={2.6}
          aria-hidden
        />
      </span>
      <span className="condensed text-xl font-extrabold text-ink">PokeNow</span>
    </span>
  );
}
