export type SpotTagKind = 'busy' | 'weather';

export interface SpotTagEntry {
  count: number;
  updatedAt: number;
}

export type SpotTagsMap = Record<string, Partial<Record<SpotTagKind, SpotTagEntry>>>;

export const TAG_TTL_MS = 60 * 60 * 1000;
export const VOTE_COOLDOWN_MS = 15 * 60 * 1000;

export function tagsEndpointFrom(reportUrl: string): string {
  if (!reportUrl) return '';
  return reportUrl.replace(/\/report\/?$/, '/tags');
}

function voteKey(spotId: string, tag: SpotTagKind): string {
  return `pokenow:tag-vote:${spotId}:${tag}`;
}

export function canVoteLocally(spotId: string, tag: SpotTagKind, now = Date.now()): boolean {
  try {
    const raw = window.localStorage.getItem(voteKey(spotId, tag));
    if (!raw) return true;
    const ts = Number(raw);
    return !Number.isFinite(ts) || now - ts >= VOTE_COOLDOWN_MS;
  } catch {
    return true;
  }
}

export function markVotedLocally(spotId: string, tag: SpotTagKind, now = Date.now()): void {
  try {
    window.localStorage.setItem(voteKey(spotId, tag), String(now));
  } catch {
    // ignore storage quota/privacy mode errors
  }
}

export function applyOptimisticTag(
  tags: SpotTagsMap,
  spotId: string,
  tag: SpotTagKind,
  now = Date.now(),
): SpotTagsMap {
  const current = tags[spotId] ?? {};
  const prev = current[tag];
  const activeCount = prev && now - prev.updatedAt < TAG_TTL_MS ? prev.count : 0;
  return {
    ...tags,
    [spotId]: {
      ...current,
      [tag]: { count: activeCount + 1, updatedAt: now },
    },
  };
}
