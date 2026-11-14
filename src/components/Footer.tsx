import { CONFIG } from '../config';
import { useI18n } from '../i18n';
import { issueTemplateUrl } from '../lib/github';
import { Logo } from './Logo';
import { GitHubMark } from './GitHubMark';

export function Footer() {
  const { t, locale } = useI18n();
  return (
    <footer className="mt-12 border-t border-rule pt-8 pb-10 text-sm text-dim">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-xl space-y-2">
          <Logo />
          <p className="leading-relaxed">{t.footer.disclaimer}</p>
          <p className="text-xs leading-relaxed text-faint">{t.footer.extra}</p>
        </div>

        <div className="flex flex-col gap-2 self-start sm:items-end">
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
          <a
            // The language and page are filled into the issue form automatically.
            href={issueTemplateUrl('translation.yml', { language: locale, page: window.location.href.split('#')[0] })}
            target="_blank"
            rel="noopener noreferrer"
            className="px-1 text-sm text-dim underline underline-offset-4 hover:text-ink"
          >
            {t.footer.translation}
          </a>
        </div>
      </div>
    </footer>
  );
}
