import { describe, it, expect } from 'vitest';
import { addPreset, MAX_PRESETS, removePreset } from './presets';

describe('travel presets', () => {
  it('deduplicates by coordinates and caps at MAX_PRESETS', () => {
    let list = addPreset([], { label: 'Home', lat: 37.5, lng: 127.0 });
    list = addPreset(list, { label: 'Home duplicate', lat: 37.5, lng: 127.0 });
    expect(list).toHaveLength(1);

    for (let i = 1; i <= 6; i++) {
      list = addPreset(list, { label: `Spot ${i}`, lat: 37.5 + i, lng: 127.0 });
    }
    expect(list).toHaveLength(MAX_PRESETS);
    expect(list[0].label).toBe('Spot 6');
  });

  it('removes a preset by id', () => {
    const list = addPreset([], { label: 'Home', lat: 37.5, lng: 127.0 });
    expect(removePreset(list, list[0].id)).toEqual([]);
  });
});
