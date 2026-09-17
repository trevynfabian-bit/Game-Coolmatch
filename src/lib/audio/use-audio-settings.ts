"use client";

import { useEffect } from "react";
import { setAudioVolumes } from "@/lib/audio/audio-engine";
import { effectiveVolume } from "@/lib/game/settings";
import { useSettingsStore } from "@/lib/store/settings-store";

/**
 * Menyalurkan pengaturan suara ke mesin audio, dan terus menjaganya sejalan.
 *
 * Dipasang di tiap layar yang mengeluarkan bunyi, bukan sekali di akar
 * aplikasi. Mesin audio hidup di luar React — ia satu objek modul — jadi
 * penyaluran ini hanya perlu ada selama ada yang berbunyi, dan layar yang
 * memang diam tidak perlu ikut melanggani perubahan volume.
 *
 * `muted` sengaja tidak dikirim terpisah. `effectiveVolume` sudah
 * memperhitungkannya, sehingga mesin audio tidak perlu mengingat sendiri
 * bahwa tombol bisu mengalahkan angka volumenya.
 */
export function useAudioSettings() {
  const audio = useSettingsStore((state) => state.audio);

  useEffect(() => {
    setAudioVolumes(
      effectiveVolume(audio, "effects"),
      effectiveVolume(audio, "music"),
    );
  }, [audio]);
}
