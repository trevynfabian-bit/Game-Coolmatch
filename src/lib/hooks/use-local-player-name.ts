"use client";

import { DEFAULT_PLAYER_NAME } from "@/lib/game/player-name";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { useProfileStore } from "@/lib/store/profile-store";

/**
 * Nama pemain di perangkat ini, aman dipakai saat render.
 *
 * Sebelum hidrasi ia mengembalikan nama bawaan, bukan nama tersimpan: server
 * tidak bisa membaca localStorage, jadi menyebut nama pilihan pemain pada saat
 * itu membuat hasil prerender dan hasil hidrasi berselisih.
 *
 * Dipisah dari store-nya supaya layar tidak perlu mengingat aturan itu satu
 * per satu. Papan skor, klasemen akhir, dan kill feed sama-sama menyebut nama
 * ini; salah satu yang lupa menjaganya sudah cukup untuk merusak halamannya.
 */
export function useLocalPlayerName(): string {
  const hydrated = useHydrated();
  const playerName = useProfileStore((state) => state.playerName);
  return hydrated ? playerName : DEFAULT_PLAYER_NAME;
}
