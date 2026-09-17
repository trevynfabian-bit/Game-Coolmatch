"use client";

import { useState } from "react";
import { QUALITY_PROFILES, canvasDpr } from "@/lib/game/settings";
import { useSettingsStore } from "@/lib/store/settings-store";

/**
 * Setelan kanvas 3D yang mengikuti tingkat kualitas pilihan pemain.
 *
 * Dibaca SEKALI saat kanvas dipasang, bukan dilanggani. Bayangan dan
 * penghalusan tepi ditentukan waktu konteks WebGL dibuat; mengubahnya di
 * tengah pertandingan berarti membangun ulang kanvas, dan itu berarti arena
 * berkedip hitam lalu pertandingan dimulai dari awal. Karena itu layar
 * Pengaturan menjanjikan perubahannya berlaku "pada pertandingan berikutnya",
 * dan janji itulah yang ditepati di sini.
 *
 * Kanvas hanya berjalan di browser — keduanya dimuat dengan `ssr: false` —
 * jadi membaca simpanan di sini tidak punya render server untuk dicocokkan.
 */
export function useRenderQuality() {
  const [profile] = useState(() => {
    const { quality, renderScale } = useSettingsStore.getState().display;
    return {
      ...QUALITY_PROFILES[quality],
      // Rentang dpr menggabungkan tingkat kualitas dengan skala resolusi;
      // yang dipakai kanvas adalah hasil gabungannya, bukan salah satunya.
      dpr: canvasDpr(quality, renderScale),
    };
  });
  return profile;
}
