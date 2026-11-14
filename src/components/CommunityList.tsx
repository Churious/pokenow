import { ExternalLink, Plus } from 'lucide-react';
import { communitiesFor, type Community } from '../data/communities';
import { ReportLink } from './ReportDialog';
import { useI18n } from '../i18n';


function platformLabel(c: Community, kakao: string, other: string): string {
  switch (c.platform) {
    case 'discord':
      return 'Discord';
    case 'kakao':
      return kakao;
    case 'line':
      return 'LINE';
    case 'telegram':
      return 'Telegram';
    case 'whatsapp':
      return 'WhatsApp';
    default:
      return other;
  }
}

/**
 * Free community directory for a spot (spot-specific first, then global ones).
 * Shows a clear "list yours" call to action — including when the list is empty.
 */
export function CommunityList({ hotspotId, compact = false }: { hotspotId: string | null; compact?: boolean }) {
  const { t, locale } = useI18n();
  const items = communitiesFor(hotspotId);

  let langName: (code: string) => string = (c) => c;
  try {
    const dn = new Intl.DisplayNames([locale], { type: 'language' });
    langName = (c) => dn.of(c) ?? c;
  } catch {
    /* older browsers: show the code */
  }

  return (
    <section aria-labelledby={`communities-${hotspotId ?? 'home'}`} className="border-t border-rule pt-5">
      <h2 id={`communities-${hotspotId ?? 'home'}`} className="semi-condensed text-lg font-bold text-ink">
        {t.community.title}
      </h2>
      {!compact && <p className="mt-1 max-w-prose text-sm text-dim">{t.community.intro}</p>}

      {items.length > 0 ? (
        <ul className="mt-3 divide-y divide-rule border-y border-rule">
          {items.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{c.name}</p>
                <p className="truncate text-sm text-dim">
                  {platformLabel(c, t.community.kakao, t.community.other)}
                  {', '}
                  {c.languages.map(langName).join(', ')}
                  {c.hotspots.includes('*') && `, ${t.community.global}`}
                </p>
                {c.description && <p className="mt-0.5 truncate text-sm text-dim">{c.description}</p>}
              </div>
              <a
                href={c.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-md px-3 text-sm font-semibold text-ink ring-1 ring-rule hover:ring-dim"
              >
                {t.community.join}
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-dim">{t.community.empty}</p>
      )}

      <ReportLink
        kind="community"
        className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-md bg-ink px-3 text-sm font-semibold text-night hover:bg-white"
      >
        <Plus className="size-4" aria-hidden />
        {t.community.add}
      </ReportLink>
      <p className="mt-2 text-xs text-faint">{t.community.rules}</p>
    </section>
  );
}
