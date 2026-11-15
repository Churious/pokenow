import { describe, expect, it } from 'vitest';
import {
  INSTALL_DONE,
  INSTALL_SNOOZE_MS,
  installVariant,
  isIos,
  isStandalone,
  shouldShowInstallNote,
} from './install';

describe('install note snooze', () => {
  const now = 1_800_000_000_000;
  it('shows when never closed or the value is junk', () => {
    expect(shouldShowInstallNote(null, now)).toBe(true);
    expect(shouldShowInstallNote('abc', now)).toBe(true);
    expect(shouldShowInstallNote('-5', now)).toBe(true);
    expect(shouldShowInstallNote(String(now + 60_000), now)).toBe(true);
  });
  it('stays hidden for a month after closing', () => {
    expect(shouldShowInstallNote(String(now - 1000), now)).toBe(false);
    expect(shouldShowInstallNote(String(now - INSTALL_SNOOZE_MS + 1), now)).toBe(false);
    expect(shouldShowInstallNote(String(now - INSTALL_SNOOZE_MS), now)).toBe(true);
  });
  it('never comes back after an install', () => {
    expect(shouldShowInstallNote(INSTALL_DONE, now)).toBe(false);
    expect(shouldShowInstallNote(INSTALL_DONE, 0)).toBe(false);
  });
});

describe('install environment', () => {
  it('detects the installed window', () => {
    expect(isStandalone(true, undefined)).toBe(true);
    expect(isStandalone(false, true)).toBe(true);
    expect(isStandalone(false, undefined)).toBe(false);
    expect(isStandalone(false, false)).toBe(false);
  });
  it('detects iOS, including iPadOS on a desktop user agent', () => {
    expect(isIos('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 'iPhone', 5)).toBe(true);
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 5)).toBe(true);
    expect(isIos('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 'MacIntel', 0)).toBe(false);
    expect(isIos('Mozilla/5.0 (Linux; Android 14) Chrome/130.0', 'Linux armv8l', 5)).toBe(false);
  });
  it('offers the browser prompt, the iOS steps, or nothing', () => {
    expect(installVariant(true, false)).toBe('prompt');
    expect(installVariant(true, true)).toBe('prompt');
    expect(installVariant(false, true)).toBe('manual');
    expect(installVariant(false, false)).toBe('none');
  });
});
