"use client";

import { favoriteKey, useFavoriteStore, type FavoriteKind } from "@/lib/store/favorite-store";

/** Tombol bintang untuk menandai atau melepas favorit sebuah item galeri. */
export function FavoriteButton({ kind, id, label }: { kind: FavoriteKind; id: string; label: string }) {
  const active = useFavoriteStore((state) => state.favorites.includes(favoriteKey(kind, id)));
  const toggle = useFavoriteStore((state) => state.toggle);

  return (
    <button
      type="button"
      onClick={() => toggle(kind, id)}
      aria-pressed={active}
      aria-label={active ? `Hapus ${label} dari favorit` : `Tandai ${label} sebagai favorit`}
      title={active ? "Favorit" : "Tandai favorit"}
      className={`grid h-7 w-7 place-items-center rounded-md border bg-slate-900/80 transition-colors ${
        active ? "border-amber-400/50 text-amber-300" : "border-white/10 text-slate-400 hover:border-white/30 hover:text-white"
      }`}
    >
      <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.4" aria-hidden>
        <path d="M8 1.8l1.8 3.9 4.2.5-3.1 2.9.8 4.2L8 11.2l-3.7 2.1.8-4.2L2 6.2l4.2-.5z" strokeLinejoin="round" />
      </svg>
    </button>
  );
}
