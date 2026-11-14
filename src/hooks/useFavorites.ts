import { useCallback, useState } from 'react';
import { loadFavorites, saveFavorites, toggleFavorite } from '../lib/favorites';

/**
 * The visitor's pinned spots, remembered in this browser only.
 * Nothing is sent anywhere; clearing site data clears the pins.
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(loadFavorites);

  const toggle = useCallback((id: string) => {
    setFavorites((prev) => {
      const next = toggleFavorite(prev, id);
      saveFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  return { favorites, isFavorite, toggle };
}
