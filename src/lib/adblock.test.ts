import { describe, expect, it } from 'vitest';
import { SNOOZE_MS, isBlocked, shouldShowSupportNote, supportOutcome } from './adblock';

describe('support note snooze', () => {
  const now = 1_800_000_000_000;
  it('shows when never closed or the value is junk', () => {
    expect(shouldShowSupportNote(null, now)).toBe(true);
    expect(shouldShowSupportNote('abc', now)).toBe(true);
    expect(shouldShowSupportNote('-5', now)).toBe(true);
    expect(shouldShowSupportNote(String(now + 60_000), now)).toBe(true);
  });
  it('stays hidden for a week after closing', () => {
    expect(shouldShowSupportNote(String(now - 1000), now)).toBe(false);
    expect(shouldShowSupportNote(String(now - SNOOZE_MS + 1), now)).toBe(false);
    expect(shouldShowSupportNote(String(now - SNOOZE_MS), now)).toBe(true);
  });
});

describe('ad-block signals', () => {
  it('needs at least one signal', () => {
    expect(isBlocked(null)).toBe(false);
    expect(isBlocked({ network: false, cosmetic: false, script: false })).toBe(false);
    expect(isBlocked({ network: false, cosmetic: false, script: true })).toBe(true);
    expect(isBlocked({ network: true, cosmetic: false, script: false })).toBe(true);
  });
});

describe('support outcome', () => {
  const now = 1_800_000_000_000;
  it('asks while blocked unless snoozed', () => {
    expect(supportOutcome(true, false, null, now)).toBe('ask');
    expect(supportOutcome(true, true, String(now - 1000), now)).toBe('none');
  });
  it('thanks once the blocker is gone after an earlier visit with one', () => {
    expect(supportOutcome(false, true, null, now)).toBe('thanks');
    expect(supportOutcome(false, true, String(now - 1000), now)).toBe('thanks');
    expect(supportOutcome(false, false, null, now)).toBe('none');
  });
});
