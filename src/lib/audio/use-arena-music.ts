"use client";

import { useEffect } from "react";
import {
  startAmbience,
  startMusic,
  stopAmbience,
  stopMusic,
} from "@/lib/audio/audio-engine";
import { usePlayerStore } from "@/lib/store/player-store";

/**
 * Menyalakan dengung latar dan suasana arena selama pemain benar-benar
 * bermain.
 *
 * Diikatkan pada kunci kursor, bukan pada terbukanya halaman. Browser menolak
 * memutar suara sebelum ada gerakan pengguna, dan klik yang mengunci kursor
 * itulah gerakan pertama yang pasti terjadi di arena — mencoba lebih awal
 * hanya menghasilkan konteks audio tertidur yang tidak pernah bangun.
 *
 * Ikut berhenti saat pemain menekan Escape. Layar jeda membekukan musuh dan
 * jam ronde; dengung yang terus berjalan di atasnya membuat jeda terasa
 * seperti bukan jeda.
 */
export function useArenaMusic(mapId?: string | null) {
  const isLocked = usePlayerStore((state) => state.isLocked);

  useEffect(() => {
    if (isLocked) {
      startMusic();
      // Suasana mengikuti peta: gudang berdecit, pabrik berdengung, atap
      // kena angin. Itulah yang membuat peta terasa sebagai tempat.
      startAmbience(mapId);
    } else {
      stopMusic();
      stopAmbience();
    }
  }, [isLocked, mapId]);

  // Meninggalkan halaman juga menghentikannya; tanpa ini dengungnya ikut
  // terbawa ke menu utama dan tidak ada lagi yang mematikannya.
  useEffect(
    () => () => {
      stopMusic();
      stopAmbience();
    },
    [],
  );
}
