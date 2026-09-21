"use client";

import { useEffect } from "react";
import {
  setMusicPhase,
  startAmbience,
  startMusic,
  stopAmbience,
  stopMusic,
} from "@/lib/audio/audio-engine";
import { musicPhaseFor } from "@/lib/audio/music-voice";
import { useMatchStore } from "@/lib/store/match-store";
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

  /*
    Musik mengikuti jalannya pertandingan: menunggu, bertempur, ronde
    penentuan, jeda, usai. Yang dilanggani hanya ketiga angka yang
    menentukan babaknya, bukan seluruh keadaan ronde — jam ronde berubah tiap
    detik, dan melangganinya berarti menghitung ulang babak enam puluh kali
    per menit untuk jawaban yang sama.
  */
  const status = useMatchStore((state) => state.round.status);
  const current = useMatchStore((state) => state.round.current);
  const total = useMatchStore((state) => state.round.total);

  useEffect(() => {
    setMusicPhase(musicPhaseFor({ status, current, total }));
  }, [status, current, total]);

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
