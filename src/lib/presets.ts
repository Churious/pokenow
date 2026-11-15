export const PRESETS_KEY = 'pokenow:presets';
export const MAX_PRESETS = 5;

export interface TravelPreset {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

export function readPresets(): TravelPreset[] {
  try {
    const raw = localStorage.getItem(PRESETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (p): p is TravelPreset =>
          Boolean(p) &&
          typeof p.id === 'string' &&
          typeof p.label === 'string' &&
          typeof p.lat === 'number' &&
          typeof p.lng === 'number',
      )
      .slice(0, MAX_PRESETS);
  } catch {
    return [];
  }
}

export function writePresets(list: readonly TravelPreset[]): void {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(list.slice(0, MAX_PRESETS)));
  } catch {
    /* ignore */
  }
}

export function addPreset(list: readonly TravelPreset[], item: Omit<TravelPreset, 'id'>): TravelPreset[] {
  const cleanLabel = item.label.trim().slice(0, 40);
  if (!cleanLabel) return [...list];
  const exists = list.some(
    (p) => Math.abs(p.lat - item.lat) < 0.0001 && Math.abs(p.lng - item.lng) < 0.0001,
  );
  if (exists) return [...list];
  const next: TravelPreset = {
    id: `${item.lat.toFixed(4)},${item.lng.toFixed(4)}`,
    label: cleanLabel,
    lat: item.lat,
    lng: item.lng,
  };
  return [next, ...list].slice(0, MAX_PRESETS);
}

export function removePreset(list: readonly TravelPreset[], id: string): TravelPreset[] {
  return list.filter((p) => p.id !== id);
}
