import { describe, it, expect } from 'vitest';
import {
  isProActive,
  needsRevalidation,
  OFFLINE_GRACE_MS,
  REVALIDATE_INTERVAL_MS,
  type ProState,
} from './pro';

const sample = (overrides: Partial<ProState> = {}): ProState => ({
  token: 'abc.def',
  instanceId: 'inst-1',
  keyHint: '1234',
  checkedAt: 1_000_000,
  expiresAt: 1_000_000 + 30 * 24 * 60 * 60 * 1000,
  ...overrides,
});

describe('pro license state', () => {
  it('stays active within the 72h offline grace window and expires after', () => {
    const base = 1_000_000;
    const s = sample({ checkedAt: base });
    expect(isProActive(s, base + 1000)).toBe(true);
    expect(isProActive(s, base + OFFLINE_GRACE_MS)).toBe(true);
    expect(isProActive(s, base + OFFLINE_GRACE_MS + 1)).toBe(false);
    expect(isProActive(null, base)).toBe(false);
  });

  it('requests revalidation after 24 hours', () => {
    const base = 1_000_000;
    const s = sample({ checkedAt: base });
    expect(needsRevalidation(s, base + REVALIDATE_INTERVAL_MS - 1)).toBe(false);
    expect(needsRevalidation(s, base + REVALIDATE_INTERVAL_MS)).toBe(true);
  });
});
