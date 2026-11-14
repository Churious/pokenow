/**
 * Very small platform sniffing, only used to pick the right app-store link.
 * Falls back to the website whenever we're not sure.
 */

export type Platform = 'ios' | 'android' | 'other';

export function detectPlatform(
  userAgent: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
  maxTouchPoints: number = typeof navigator !== 'undefined' ? navigator.maxTouchPoints ?? 0 : 0,
): Platform {
  if (/android/i.test(userAgent)) return 'android';
  if (/iphone|ipad|ipod/i.test(userAgent)) return 'ios';
  // iPadOS 13+ reports itself as a Mac; a Mac with a touch screen is an iPad.
  if (/macintosh/i.test(userAgent) && maxTouchPoints > 1) return 'ios';
  return 'other';
}

/**
 * Official Campfire links (from campfire.scopely.com).
 * The App Store slug and Android package still use the original Niantic
 * identifiers; don't "fix" them or the store links break.
 */
export const CAMPFIRE_LINKS: Record<Platform, string> = {
  ios: 'https://apps.apple.com/app/niantic-campfire/id1608615554',
  android: 'https://play.google.com/store/apps/details?id=com.nianticlabs.campfire',
  other: 'https://campfire.scopely.com/en/',
};

export const campfireHref = (platform: Platform = detectPlatform()): string => CAMPFIRE_LINKS[platform];
