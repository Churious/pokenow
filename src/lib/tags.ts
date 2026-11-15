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

export function hasVotedLocally(spotId: string, tag: SpotTagKind, now = Date.now()): boolean {
  try {
    const raw = window.localStorage.getItem(voteKey(spotId, tag));
    if (!raw) return false;
    const ts = Number(raw);
    return Number.isFinite(ts) && now - ts < TAG_TTL_MS;
  } catch {
    return false;
  }
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

export function clearVotedLocally(spotId: string, tag: SpotTagKind): void {
  try {
    window.localStorage.removeItem(voteKey(spotId, tag));
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

export function removeOptimisticTag(
  tags: SpotTagsMap,
  spotId: string,
  tag: SpotTagKind,
  now = Date.now(),
): SpotTagsMap {
  const current = tags[spotId] ?? {};
  const prev = current[tag];
  const activeCount = prev && now - prev.updatedAt < TAG_TTL_MS ? prev.count : 0;
  const nextCount = Math.max(0, activeCount - 1);
  const nextSpot = { ...current };
  if (nextCount > 0) {
    nextSpot[tag] = { count: nextCount, updatedAt: prev?.updatedAt ?? now };
  } else {
    delete nextSpot[tag];
  }
  return {
    ...tags,
    [spotId]: nextSpot,
  };
}
