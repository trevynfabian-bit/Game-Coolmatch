"use client";

import { useProfileStore } from "@/lib/store/profile-store";

/**
 * Nama pemain yang sedang dipakai.
 *
 * Komponen klien tersendiri, sekecil ini, dengan alasan yang sama seperti
 * `SelectedMapLabel`: hanya baris inilah yang butuh membaca pilihan tersimpan,
 * jadi menu utama tetap berupa komponen server.
 */
export function PlayerNameLabel() {
  const playerName = useProfileStore((state) => state.playerName);
  return <>{playerName}</>;
}
