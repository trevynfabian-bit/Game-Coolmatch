"use client";

import { useEffect } from "react";
import { applyAudioSettings, installUnlock } from "@/lib/audio/engine";
import { MuteHotkey } from "@/components/settings/quick-audio-control";
import { useSettingsStore } from "@/lib/store/settings-store";

/**
 * Memasang mesin audio sekali di layout akar: menyimak gestur pertama untuk
 * membuka audio, menerapkan volume dari pengaturan setiap kali berubah, dan
 * memasang tombol M untuk bisukan.
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
  return <MuteHotkey />;
}
