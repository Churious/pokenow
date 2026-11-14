import { GitFork } from 'lucide-react';
import { CONFIG } from '../config';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="mt-12 border-t border-line pt-8 pb-10 text-sm text-slate-400">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl space-y-2">
          <Logo />
          {/* Required disclaimer — keep wording intact. */}
          <p className="leading-relaxed">
            PokeSpot is a fan-made utility for tracking global raid hours and coordinating remote raids. Not
            affiliated with Niantic or The Pokémon Company.
          </p>
          <p className="text-xs leading-relaxed text-slate-500">
            Also not affiliated with Scopely, the current operator of Pokémon GO. Pokémon and all related names are
            trademarks of their respective owners. Event times are local-time conventions and may change — check
            official announcements.
          </p>
        </div>

        <a
          href={CONFIG.githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex h-11 shrink-0 items-center gap-2 self-start rounded-xl whitespace-nowrap px-4 font-semibold text-slate-200 ring-1 ring-line hover:bg-panel-2"
        >
          <GitFork className="size-4" aria-hidden />
          GitHub · MIT License
        </a>
      </div>
    </footer>
  );
}
