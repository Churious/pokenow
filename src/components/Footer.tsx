import { useState } from 'react';
import { KeyRound } from 'lucide-react';
import { CONFIG } from '../config';
import { useI18n } from '../i18n';
import { usePro } from '../hooks/usePro';
import { ProDialog } from './ProDialog';
import { ReportLink } from './ReportDialog';
import { Logo } from './Logo';
import { GitHubMark } from './GitHubMark';

export function Footer() {
  const { t } = useI18n();
  const { isPro } = usePro();
  const [proOpen, setProOpen] = useState(false);

  return (
    <footer className="mt-12 border-t border-rule pt-8 pb-10 text-sm text-dim">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl space-y-2">
          <Logo />
          <p className="leading-relaxed">{t.footer.disclaimer}</p>
          <p className="text-xs leading-relaxed text-faint">{t.footer.extra}</p>
        </div>

        <div className="flex flex-col gap-2 self-start sm:items-end">
          <button
            type="button"
            onClick={() => setProOpen(true)}
            className={`inline-flex h-11 shrink-0 items-center gap-2 rounded-md px-4 font-semibold whitespace-nowrap ring-1 ${
              isPro ? 'text-gold ring-gold/50 hover:ring-gold' : 'text-ink ring-rule hover:ring-dim'
            }`}
          >
            <KeyRound className="size-4" aria-hidden />
            {isPro ? t.pro.activeBadge : t.pro.button}
          </button>
          <a
            href={CONFIG.githubUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 shrink-0 items-center gap-2 rounded-md px-4 font-semibold whitespace-nowrap text-ink ring-1 ring-rule hover:ring-dim"
          >
            <GitHubMark className="size-4" />
            {t.footer.source}
          </a>
          <a href="privacy.html" className="px-1 text-sm text-dim underline underline-offset-4 hover:text-ink">
            {t.footer.privacy}
          </a>
          <ReportLink kind="translation" className="px-1 text-left text-sm text-dim underline underline-offset-4 hover:text-ink">
            {t.footer.translation}
          </ReportLink>
        </div>
      </div>
      <ProDialog open={proOpen} onClose={() => setProOpen(false)} />
    </footer>
  );
}
