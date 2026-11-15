import { useCallback, useEffect, useState } from 'react';
import { CONFIG } from '../config';
import {
  applyOptimisticTag,
  clearVotedLocally,
  hasVotedLocally,
  markVotedLocally,
  removeOptimisticTag,
  tagsEndpointFrom,
  type SpotTagEntry,
  type SpotTagKind,
  type SpotTagsMap,
} from '../lib/tags';

export function useSpotTags() {
  const endpoint = tagsEndpointFrom(CONFIG.report.url);
  const [tags, setTags] = useState<SpotTagsMap>({});

  useEffect(() => {
    if (!endpoint) return;
    let active = true;

    const load = async () => {
      try {
        const res = await fetch(endpoint);
        if (!res.ok) return;
        const data = (await res.json()) as { tags?: SpotTagsMap };
        if (active && data?.tags) setTags(data.tags);
      } catch {
        // Worker offline or unreachable; keep current state
      }
    };

    void load();
    const timer = window.setInterval(() => void load(), 60_000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [endpoint]);

  const vote = useCallback(
    async (spotId: string, tag: SpotTagKind): Promise<'voted' | 'removed'> => {
      const removing = hasVotedLocally(spotId, tag);
      if (removing) {
        clearVotedLocally(spotId, tag);
        setTags((prev) => removeOptimisticTag(prev, spotId, tag));
      } else {
        markVotedLocally(spotId, tag);
        setTags((prev) => applyOptimisticTag(prev, spotId, tag));
      }

      if (endpoint) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ spotId, tag, action: removing ? 'remove' : 'add' }),
          });
          if (res.ok) {
            const data = (await res.json()) as { entry?: SpotTagEntry | null };
            setTags((prev) => {
              const spot = { ...(prev[spotId] ?? {}) };
              if (data?.entry) spot[tag] = data.entry;
              else delete spot[tag];
              return { ...prev, [spotId]: spot };
            });
          }
        } catch {
          // Keep optimistic local tag state
        }
      }
      return removing ? 'removed' : 'voted';
    },
    [endpoint],
  );

  return { tags, vote };
}
