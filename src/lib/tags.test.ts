import { describe, expect, it } from 'vitest';
import { applyOptimisticTag, removeOptimisticTag, TAG_TTL_MS, tagsEndpointFrom } from './tags';

describe('tags helpers', () => {
  it('derives /tags endpoint from /report URL', () => {
    expect(tagsEndpointFrom('https://pokenow-report.example.workers.dev/report')).toBe(
      'https://pokenow-report.example.workers.dev/tags',
    );
    expect(tagsEndpointFrom('')).toBe('');
  });

  it('increments active counts and resets expired counts (>1h)', () => {
    const now = 1_700_000_000_000;
    const initial = {
      'seoul-city-hall': {
        busy: { count: 2, updatedAt: now - 10_000 },
        weather: { count: 5, updatedAt: now - TAG_TTL_MS - 1000 },
      },
    };
    const next1 = applyOptimisticTag(initial, 'seoul-city-hall', 'busy', now);
    expect(next1['seoul-city-hall']?.busy?.count).toBe(3);

    const next2 = applyOptimisticTag(next1, 'seoul-city-hall', 'weather', now);
    expect(next2['seoul-city-hall']?.weather?.count).toBe(1);

    const removed = removeOptimisticTag(next2, 'seoul-city-hall', 'weather', now);
    expect(removed['seoul-city-hall']?.weather).toBeUndefined();
  });
});
