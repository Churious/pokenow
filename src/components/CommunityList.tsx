import { useMemo, useState } from 'react';
import { ExternalLink, Plus } from 'lucide-react';
import { allCommunities, communitiesFor, type CommunityPlatform } from '../data/communities';
import { ReportLink } from './ReportDialog';
import { useI18n } from '../i18n';


function platformLabel(platform: CommunityPlatform, kakao: string, other: string): string {
  switch (platform) {
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
 * Free community directory for a spot (spot-specific first, then global ones)
 * or full directory when `showAll` is true.
 */
export function CommunityList({
  hotspotId,
  compact = false,
  showAll = false,
  maxItems,
  onViewAll,
}: {
  hotspotId: string | null;
  compact?: boolean;
  showAll?: boolean;
  maxItems?: number;
  onViewAll?: () => void;
}) {
  const { t, locale } = useI18n();
  const [platform, setPlatform] = useState<'all' | CommunityPlatform>('all');

  const rawItems = useMemo(
    () => (showAll ? allCommunities() : communitiesFor(hotspotId)),
    [showAll, hotspotId],
  );

  const platforms = useMemo(
    () => Array.from(new Set(rawItems.map((c) => c.platform))),
    [rawItems],
  );

  const filtered = useMemo(
    () => (platform === 'all' ? rawItems : rawItems.filter((c) => c.platform === platform)),
    [rawItems, platform],
  );

  const items = maxItems ? filtered.slice(0, maxItems) : filtered;

  let langName: (code: string) => string = (c) => c;
  try {
    const dn = new Intl.DisplayNames([locale], { type: 'language' });
    langName = (c) => dn.of(c) ?? c;
  } catch {
    /* older browsers: show the code */
  }

  return (
    <section aria-labelledby={`communities-${hotspotId ?? (showAll ? 'all' : 'home')}`} className={showAll ? '' : 'border-t border-rule pt-5'}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id={`communities-${hotspotId ?? (showAll ? 'all' : 'home')}`} className="semi-condensed text-lg font-bold text-ink">
          {t.community.title}
        </h2>
        {onViewAll && (
          <button
            type="button"
            onClick={onViewAll}
            className="text-xs font-medium text-dim underline underline-offset-4 hover:text-ink"
          >
            {t.tabs.communities}
          </button>
        )}
      </div>
      {!compact && <p className="mt-1 max-w-prose text-sm text-dim">{t.community.intro}</p>}

      {showAll && platforms.length > 1 && (
        <div role="group" aria-label={t.report.platform} className="mt-3 flex gap-2 overflow-x-auto p-px">
          <button
            type="button"
            aria-pressed={platform === 'all'}
            onClick={() => setPlatform('all')}
            className={`h-8 shrink-0 rounded-full px-3 text-xs whitespace-nowrap ${
              platform === 'all' ? 'bg-ink font-semibold text-night' : 'text-dim ring-1 ring-rule hover:text-ink'
            }`}
          >
            {t.list.all}
          </button>
          {platforms.map((p) => (
            <button
              key={p}
              type="button"
              aria-pressed={platform === p}
              onClick={() => setPlatform(p)}
              className={`h-8 shrink-0 rounded-full px-3 text-xs whitespace-nowrap ${
                platform === p ? 'bg-ink font-semibold text-night' : 'text-dim ring-1 ring-rule hover:text-ink'
              }`}
            >
              {platformLabel(p, t.community.kakao, t.community.other)}
            </button>
          ))}
        </div>
      )}

      {items.length > 0 ? (
        <ul className="mt-3 divide-y divide-rule border-y border-rule">
          {items.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate font-semibold text-ink">{c.name}</p>
                <p className="truncate text-sm text-dim">
                  {platformLabel(c.platform, t.community.kakao, t.community.other)}
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
