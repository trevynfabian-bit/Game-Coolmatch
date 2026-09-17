"use client";

import { useState } from "react";
import { QUALITY_PROFILES } from "@/lib/game/settings";
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
  const [profile] = useState(
    () => QUALITY_PROFILES[useSettingsStore.getState().display.quality],
  );
  return profile;
}
