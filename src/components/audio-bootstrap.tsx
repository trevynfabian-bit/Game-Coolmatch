"use client";

import { useEffect } from "react";
import { applyAudioSettings, installUnlock } from "@/lib/audio/engine";
import { useSettingsStore } from "@/lib/store/settings-store";

/**
 * Memasang mesin audio sekali di layout akar: menyimak gestur pertama untuk
 * membuka audio, dan menerapkan volume dari pengaturan setiap kali berubah.
 */
export function AudioBootstrap() {
  useEffect(() => {
    applyAudioSettings(useSettingsStore.getState().audio);
    const unsubscribe = useSettingsStore.subscribe((state, previous) => {
      if (state.audio !== previous.audio) applyAudioSettings(state.audio);
    });
    const removeUnlock = installUnlock();
    return () => {
      unsubscribe();
      removeUnlock();
    };
  }, []);
  return null;
}
