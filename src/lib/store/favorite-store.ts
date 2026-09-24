import { create } from "zustand";

/**
 * Penanda favorit untuk senjata dan skin di galeri.
 *
 * Kuncinya berbentuk "senjata:<id>" atau "skin:<id>". Fase frontend
 * menyimpannya di memori klien; lapisan backend nanti memuat dan menyimpannya
 * di server lewat `hydrate` dan aksi yang sama.
 */
export type FavoriteKind = "senjata" | "skin";

export function favoriteKey(kind: FavoriteKind, id: string): string {
  return `${kind}:${id}`;
}

interface FavoriteState {
  favorites: string[];
  hydrate: (favorites: string[]) => void;
  toggle: (kind: FavoriteKind, id: string) => void;
}

/** Favorit tiruan: senapan serbu sudah ditandai. */
const MOCK_FAVORITES = [favoriteKey("senjata", "wpn-rifle-garuda")];

export const useFavoriteStore = create<FavoriteState>((set) => ({
  favorites: MOCK_FAVORITES,
  hydrate: (favorites) => set({ favorites }),
  toggle: (kind, id) =>
    set((state) => {
      const key = favoriteKey(kind, id);
      return {
        favorites: state.favorites.includes(key)
          ? state.favorites.filter((item) => item !== key)
          : [...state.favorites, key],
      };
    }),
}));

/** Mengurutkan daftar supaya favorit berada di depan, urutan lain dipertahankan. */
export function favoritesFirst<T>(items: T[], isFavorite: (item: T) => boolean): T[] {
  return [...items.filter(isFavorite), ...items.filter((item) => !isFavorite(item))];
}
