/**
 * "Install PokeNow" note (components/InstallNote.tsx). Pure helpers only; the browser events live
 * in hooks/useInstallPrompt.ts.
 *
 * The note is an offer, never a wall: "Not now" hides it for a month, installing ends it for good,
 * and browsers that cannot install the app are never asked at all.
 */

export const INSTALL_NOTE_KEY = 'pokenow:install-note';
/** "Not now" or the close button hides the note for this long. */
export const INSTALL_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;
/** Stored after an install: nothing left to offer on this device. */
export const INSTALL_DONE = 'done';

/**
 * Whether the note may appear at all. `saved` is INSTALL_DONE once the app was installed, otherwise
 * the time the visitor closed the note. Bad or missing values count as "never closed".
 */
export function shouldShowInstallNote(saved: string | null, now: number): boolean {
  if (saved === INSTALL_DONE) return false;
  const t = Number(saved);
  if (!saved || !Number.isFinite(t) || t <= 0) return true;
  if (t > now) return true; // clock moved backwards or a junk value: do not hide it forever
  return now - t >= INSTALL_SNOOZE_MS;
}

/** True inside the installed app's own window, not in a browser tab. */
export function isStandalone(displayStandalone: boolean, navigatorStandalone: boolean | undefined): boolean {
  return displayStandalone || navigatorStandalone === true;
}

/** iPadOS 13+ sends a desktop Safari user agent, so the touch-point count gives it away. */
export function isIos(ua: string, platform: string, maxTouchPoints: number): boolean {
  return /iphone|ipad|ipod/i.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
}

/**
 * Phones and tablets only: on a PC the note is skipped and the browser's own install button (address bar)
 * stays available. iOS/iPadOS, or an Android user agent.
 */
export function isMobileDevice(ua: string, ios: boolean): boolean {
  return ios || /android/i.test(ua);
}

export type InstallVariant = 'prompt' | 'manual' | 'none';

/**
 * What the note can offer:
 *  - prompt: Chromium fired beforeinstallprompt, so the button opens its install dialog;
 *  - manual: iOS Safari has no install API, so show the Share-sheet steps instead;
 *  - none:   PCs (any browser), and phones whose browser can't install it, e.g. Firefox: stay quiet.
 */
export function installVariant(canPrompt: boolean, ios: boolean, mobile = true): InstallVariant {
  if (!mobile) return 'none';
  if (canPrompt) return 'prompt';
  return ios ? 'manual' : 'none';
}
