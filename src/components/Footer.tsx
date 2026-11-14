import { GitFork } from 'lucide-react';
import { CONFIG } from '../config';
import { Logo } from './Logo';

export function Footer() {
  return (
    <footer className="mt-12 border-t border-rule pt-8 pb-10 text-sm text-dim">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl space-y-2">
          <Logo />
          {/* Required disclaimer — keep wording intact. */}
          <p className="leading-relaxed">
            PokeSpot is a fan-made utility for tracking global raid hours and coordinating remote raids. Not
            affiliated with Niantic or The Pokémon Company.
          </p>
          <p className="text-xs leading-relaxed text-faint">
            Also not affiliated with Scopely, the current operator of Pokémon GO. Pokémon and all related names are
            trademarks of their respective owners. PokeSpot doesn’t provide or endorse location-changing tools; please
            play within the game’s Terms of Service. Event times are local-time conventions and may change, so check
            official announcements.
          </p>
        </div>

        <div className="flex flex-col gap-2 self-start sm:items-end">
          <a
            href={CONFIG.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md px-4 font-semibold whitespace-nowrap text-ink ring-1 ring-rule hover:ring-dim"
          >
            <GitFork className="size-4" aria-hidden />
            Source on GitHub (MIT)
          </a>
          <a href="privacy.html" className="px-1 text-sm text-dim underline underline-offset-4 hover:text-ink">
            Privacy policy
          </a>
        </div>
      </div>
    </footer>
  );
}
