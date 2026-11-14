import { describe, expect, it } from 'vitest';
import { parseFavorites, pinFirst, toggleFavorite } from './favorites';

describe('favorite spots', () => {
  it('parses stored ids defensively', () => {
    expect(parseFavorites(null)).toEqual([]);
    expect(parseFavorites('')).toEqual([]);
    expect(parseFavorites('not json')).toEqual([]);
    expect(parseFavorites('{"a":1}')).toEqual([]);
    expect(parseFavorites('["b","a","b",3,"",null]')).toEqual(['b', 'a']);
  });

  it('toggles an id without mutating the input', () => {
    const start = ['a', 'b'];
    expect(toggleFavorite(start, 'c')).toEqual(['a', 'b', 'c']);
    expect(toggleFavorite(start, 'a')).toEqual(['b']);
    expect(start).toEqual(['a', 'b']);
  });

  it('moves pinned items first while keeping the order inside both groups', () => {
    const list = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }];
    const pinned = new Set(['d', 'b']);
    expect(pinFirst(list, (x) => x.id, pinned).map((x) => x.id)).toEqual(['b', 'd', 'a', 'c']);
  });

  it('returns the same order when nothing is pinned', () => {
    const list = [{ id: 'a' }, { id: 'b' }];
    expect(pinFirst(list, (x) => x.id, new Set()).map((x) => x.id)).toEqual(['a', 'b']);
  });
});
