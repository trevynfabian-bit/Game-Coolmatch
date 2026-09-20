"use client";

import { useEffect } from "react";
import { setAudioVolumes, setCombatMix } from "@/lib/audio/audio-engine";
import { channelLevels } from "@/lib/game/combat-audio";
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
 *
 * Campuran tempur disalurkan lewat efek terpisah: menggeser satu kanal tidak
 * perlu menyentuh volume induk, dan sebaliknya.
 */
export function useAudioSettings() {
  const audio = useSettingsStore((state) => state.audio);
  const combatMix = useSettingsStore((state) => state.combatMix);

  useEffect(() => {
    setAudioVolumes(
      effectiveVolume(audio, "effects"),
      effectiveVolume(audio, "music"),
    );
  }, [audio]);

  useEffect(() => {
    setCombatMix(channelLevels(combatMix));
  }, [combatMix]);
}
