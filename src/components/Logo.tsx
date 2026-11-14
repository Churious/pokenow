import { Clock, Radar } from 'lucide-react';

/**
 * PokeSpot brand mark: a Lucide `Radar` sweep with a small `Clock` badge.
 * Deliberately built only from generic open-source (ISC-licensed) Lucide icons —
 * no ball/creature silhouettes or any other franchise-like shapes.
 */
export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative grid size-9 place-items-center rounded-xl bg-go/10 ring-1 ring-go/30">
        <Radar className="size-5 text-go" strokeWidth={2.2} aria-hidden />
        <span className="absolute -right-1 -bottom-1 grid size-4 place-items-center rounded-full bg-night ring-1 ring-raid/60">
          <Clock className="size-3 text-raid" strokeWidth={2.6} aria-hidden />
        </span>
      </span>
      <span className="text-lg font-extrabold tracking-tight text-white">
        Poke<span className="text-go">Spot</span>
      </span>
    </span>
  );
}
