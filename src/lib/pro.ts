/**
 * Client-side Pro license state & device identity helpers.
 * Pure functions — no React imports, unit-tested in `pro.test.ts`.
 */

export const DEVICE_ID_KEY = 'pokenow:device-id';
export const PRO_STATE_KEY = 'pokenow:pro';
export const REVALIDATE_INTERVAL_MS = 24 * 60 * 60 * 1000;
export const OFFLINE_GRACE_MS = 72 * 60 * 60 * 1000;

export interface ProState {
  token: string;
  instanceId: string;
  keyHint: string;
  checkedAt: number;
  expiresAt: number;
  swapsRemaining?: number;
}

export function isProActive(state: ProState | null, now = Date.now()): boolean {
  if (!state || !state.token || !state.instanceId) return false;
  if (now > state.expiresAt) return false;
  // Allow offline usage up to 72h after the last successful Worker check.
  if (now - state.checkedAt > OFFLINE_GRACE_MS) return false;
  return true;
}

export function needsRevalidation(state: ProState | null, now = Date.now()): boolean {
  if (!state) return false;
  return now - state.checkedAt >= REVALIDATE_INTERVAL_MS;
}

export function getOrCreateDeviceId(): string {
  try {
    const existing = localStorage.getItem(DEVICE_ID_KEY);
    if (existing && existing.length >= 8) return existing;
    const id =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    localStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return 'ephemeral-device';
  }
}

export function getDeviceLabel(): string {
  if (typeof navigator === 'undefined') return 'Browser';
  const ua = navigator.userAgent || '';
  const os = /iPhone|iPad|iPod/i.test(ua)
    ? 'iOS'
    : /Android/i.test(ua)
      ? 'Android'
      : /Windows/i.test(ua)
        ? 'Windows'
        : /Mac OS X/i.test(ua)
          ? 'macOS'
          : /Linux/i.test(ua)
            ? 'Linux'
            : 'Device';
  const browser = /Edg\//i.test(ua)
    ? 'Edge'
    : /Chrome\//i.test(ua)
      ? 'Chrome'
      : /Firefox\//i.test(ua)
        ? 'Firefox'
        : /Safari\//i.test(ua)
          ? 'Safari'
          : 'Browser';
  return `${browser} · ${os}`;
}

export function readProState(): ProState | null {
  try {
    const raw = localStorage.getItem(PRO_STATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ProState>;
    if (
      typeof parsed.token !== 'string' ||
      typeof parsed.instanceId !== 'string' ||
      typeof parsed.checkedAt !== 'number' ||
      typeof parsed.expiresAt !== 'number'
    ) {
      return null;
    }
    return {
      token: parsed.token,
      instanceId: parsed.instanceId,
      keyHint: typeof parsed.keyHint === 'string' ? parsed.keyHint : '****',
      checkedAt: parsed.checkedAt,
      expiresAt: parsed.expiresAt,
      swapsRemaining: typeof parsed.swapsRemaining === 'number' ? parsed.swapsRemaining : undefined,
    };
  } catch {
    return null;
  }
}

export function writeProState(state: ProState): void {
  try {
    localStorage.setItem(PRO_STATE_KEY, JSON.stringify(state));
  } catch {
    /* ignore private mode storage errors */
  }
}

export function clearProState(): void {
  try {
    localStorage.removeItem(PRO_STATE_KEY);
  } catch {
    /* ignore */
  }
}
