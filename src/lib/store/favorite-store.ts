import { create } from "zustand";
import { apiFetch } from "@/lib/api/client";

/**
 * Penanda favorit untuk senjata dan skin di galeri, tersimpan di server.
 *
 * Kuncinya berbentuk "senjata:<id>" atau "skin:<id>". Tombol bintang terasa
 * seketika: state diubah lebih dulu (optimistis), lalu dikembalikan bila
 * server menolak.
 */
export type FavoriteKind = "senjata" | "skin";

export function favoriteKey(kind: FavoriteKind, id: string): string {
  return `${kind}:${id}`;
}

interface FavoriteState {
  favorites: string[];
  /** Pesan galat terakhir dari server, untuk ditampilkan sebentar. */
  error: string | null;
  load: () => Promise<void>;
  hydrate: (favorites: string[]) => void;
  toggle: (kind: FavoriteKind, id: string) => Promise<void>;
}

export const useFavoriteStore = create<FavoriteState>((set, get) => ({
  favorites: [],
  error: null,

  load: async () => {
    const result = await apiFetch<{ favorites: string[] }>("/api/favorit");
    if (result.ok) set({ favorites: result.data.favorites });
  },

  hydrate: (favorites) => set({ favorites }),

  toggle: async (kind, id) => {
    const key = favoriteKey(kind, id);
    const before = get().favorites;
    set({
      error: null,
      favorites: before.includes(key) ? before.filter((item) => item !== key) : [...before, key],
    });
    const result = await apiFetch<{ favorites: string[] }>("/api/favorit/toggle", {
      method: "POST",
      body: { kind, itemId: id },
    });
    set(result.ok ? { favorites: result.data.favorites } : { favorites: before, error: result.message });
  },
}));

/** Mengurutkan daftar supaya favorit berada di depan, urutan lain dipertahankan. */
export function favoritesFirst<T>(items: T[], isFavorite: (item: T) => boolean): T[] {
  return [...items.filter(isFavorite), ...items.filter((item) => !isFavorite(item))];
}
