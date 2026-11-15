import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { CONFIG } from '../config';
import {
  clearProState,
  getDeviceLabel,
  getOrCreateDeviceId,
  isProActive,
  needsRevalidation,
  readProState,
  writeProState,
  type ProState,
} from '../lib/pro';

export type ProErrorCode =
  | 'invalid'
  | 'maxDevices'
  | 'swapLimit'
  | 'rateLimit'
  | 'captcha'
  | 'network'
  | 'notConfigured';

interface ProContextValue {
  isPro: boolean;
  state: ProState | null;
  busy: boolean;
  error: ProErrorCode | null;
  clearError: () => void;
  activate: (licenseKey: string, turnstileToken: string) => Promise<boolean>;
  deactivate: () => Promise<boolean>;
}

const ProContext = createContext<ProContextValue>({
  isPro: false,
  state: null,
  busy: false,
  error: null,
  clearError: () => {},
  activate: async () => false,
  deactivate: async () => false,
});

function mapWorkerError(code: string): ProErrorCode {
  switch (code) {
    case 'max_devices':
      return 'maxDevices';
    case 'swap_limit':
      return 'swapLimit';
    case 'rate_limit':
      return 'rateLimit';
    case 'captcha':
      return 'captcha';
    case 'license_not_configured':
      return 'notConfigured';
    default:
      return 'invalid';
  }
}

export function ProProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ProState | null>(() => readProState());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ProErrorCode | null>(null);

  const workerBase = CONFIG.pro.workerBase;
  const isPro = isProActive(state);

  // Silent background revalidation every 24h to catch refunded or deactivated keys.
  useEffect(() => {
    if (!workerBase || !state || !needsRevalidation(state)) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${workerBase}/license/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: state.token, deviceId: getOrCreateDeviceId() }),
        });
        if (cancelled) return;
        const data = (await res.json().catch(() => ({}))) as {
          valid?: boolean;
          token?: string;
          expiresAt?: number;
          swapsRemaining?: number;
        };
        if (data.valid === false) {
          clearProState();
          setState(null);
        } else if (data.valid === true && data.token && data.expiresAt) {
          const next: ProState = {
            ...state,
            token: data.token,
            expiresAt: data.expiresAt,
            checkedAt: Date.now(),
            swapsRemaining: data.swapsRemaining ?? state.swapsRemaining,
          };
          writeProState(next);
          setState(next);
        }
      } catch {
        /* Keep offline grace window if network is temporarily unavailable */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [workerBase, state]);

  const activate = useCallback(
    async (licenseKey: string, turnstileToken: string): Promise<boolean> => {
      if (!workerBase) {
        setError('notConfigured');
        return false;
      }
      setBusy(true);
      setError(null);
      try {
        const res = await fetch(`${workerBase}/license/activate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            licenseKey: licenseKey.trim(),
            deviceId: getOrCreateDeviceId(),
            deviceLabel: getDeviceLabel(),
            turnstileToken,
          }),
        });
        const data = (await res.json().catch(() => ({}))) as {
          ok?: boolean;
          token?: string;
          instanceId?: string;
          keyHint?: string;
          expiresAt?: number;
          swapsRemaining?: number;
          error?: string;
        };
        if (!res.ok || !data.ok || !data.token || !data.instanceId || !data.expiresAt) {
          setError(mapWorkerError(data.error || 'invalid'));
          return false;
        }
        const next: ProState = {
          token: data.token,
          instanceId: data.instanceId,
          keyHint: data.keyHint || licenseKey.trim().slice(-4),
          checkedAt: Date.now(),
          expiresAt: data.expiresAt,
          swapsRemaining: data.swapsRemaining,
        };
        writeProState(next);
        setState(next);
        return true;
      } catch {
        setError('network');
        return false;
      } finally {
        setBusy(false);
      }
    },
    [workerBase],
  );

  const deactivate = useCallback(async (): Promise<boolean> => {
    if (!state) return false;
    if (!workerBase) {
      setError('notConfigured');
      return false;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${workerBase}/license/deactivate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: state.token,
          instanceId: state.instanceId,
          deviceId: getOrCreateDeviceId(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(mapWorkerError(data.error || 'invalid'));
        return false;
      }
      clearProState();
      setState(null);
      return true;
    } catch {
      setError('network');
      return false;
    } finally {
      setBusy(false);
    }
  }, [workerBase, state]);

  return (
    <ProContext.Provider
      value={{
        isPro,
        state,
        busy,
        error,
        clearError: () => setError(null),
        activate,
        deactivate,
      }}
    >
      {children}
    </ProContext.Provider>
  );
}

export const usePro = () => useContext(ProContext);
