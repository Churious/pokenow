import { useCallback, useEffect, useRef, useState } from 'react';
import { evaluateAlerts, readAlertsEnabled, writeAlertsEnabled } from '../lib/alerts';
import { useI18n } from '../i18n';
import type { ScoredHotspot, TravelState } from '../types';

export function useProAlerts(
  isPro: boolean,
  ranked: readonly ScoredHotspot[],
  travel: TravelState,
  favorites: ReadonlySet<string>,
  now: Date,
) {
  const { t } = useI18n();
  const [enabled, setEnabled] = useState(() => readAlertsEnabled());
  const [denied, setDenied] = useState(
    () => typeof Notification !== 'undefined' && Notification.permission === 'denied',
  );
  const firedRef = useRef<Set<string>>(new Set());
  const wasCoolingRef = useRef(false);

  const toggle = useCallback(async () => {
    if (enabled) {
      writeAlertsEnabled(false);
      setEnabled(false);
      return;
    }
    if (typeof Notification === 'undefined') {
      setDenied(true);
      return;
    }
    let perm = Notification.permission;
    if (perm === 'default') {
      perm = await Notification.requestPermission();
    }
    if (perm !== 'granted') {
      setDenied(true);
      writeAlertsEnabled(false);
      setEnabled(false);
      return;
    }
    setDenied(false);
    writeAlertsEnabled(true);
    setEnabled(true);
  }, [enabled]);

  useEffect(() => {
    if (!isPro || !enabled) {
      wasCoolingRef.current = travel.mode !== 'free' && ranked.some((s) => s.plan.waitSeconds > 0);
      return;
    }
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;

    const { alerts, isCoolingDown } = evaluateAlerts(
      ranked,
      travel,
      favorites,
      now,
      firedRef.current,
      wasCoolingRef.current,
    );
    wasCoolingRef.current = isCoolingDown;

    for (const a of alerts) {
      firedRef.current.add(a.id);
      if (a.kind === 'cooldown') {
        new Notification(t.proFeatures.cooldownDoneTitle, { body: t.proFeatures.cooldownDoneBody });
      } else if (a.kind === 'golden' && a.city) {
        new Notification(t.proFeatures.goldenSoonTitle(a.city), { body: t.proFeatures.goldenSoonBody });
      }
    }
  }, [isPro, enabled, ranked, travel, favorites, now, t]);

  return { alertsEnabled: isPro && enabled, alertsDenied: denied, toggleAlerts: toggle };
}
