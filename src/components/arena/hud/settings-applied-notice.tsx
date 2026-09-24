"use client";

import { useEffect, useState } from "react";
import { BINDABLE_ACTIONS, DEFAULT_BINDINGS } from "@/lib/game/keybindings";
import { usePlayerStore } from "@/lib/store/player-store";
import { QUALITY_PRESETS, useSettingsStore } from "@/lib/store/settings-store";

const VISIBLE_MS = 4000;

/**
 * Konfirmasi singkat saat pemain pertama kali masuk pertandingan: pengaturan
 * tersimpan yang sedang berlaku (kualitas, sudut pandang, sensitivitas, tata
 * tombol). Muncul sekali per pertandingan, lalu memudar sendiri.
 */
export function SettingsAppliedNotice() {
  const [visible, setVisible] = useState(false);
  const graphics = useSettingsStore((state) => state.graphics);
  const controls = useSettingsStore((state) => state.controls);
  const muted = useSettingsStore((state) => state.audio.muted);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = usePlayerStore.subscribe((state, previous) => {
      if (!state.isLocked || previous.isLocked || previous.hasEngaged) return;
      setVisible(true);
      timer = setTimeout(() => setVisible(false), VISIBLE_MS);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
    };
  }, []);

  if (!visible) return null;

  const customKeys = BINDABLE_ACTIONS.filter((action) => controls.bindings[action.id] !== DEFAULT_BINDINGS[action.id]).length;
  const parts = [
    QUALITY_PRESETS[graphics.quality].label,
    `FOV ${graphics.fov}°`,
    `Sensitivitas ${controls.sensitivity.toFixed(2)}×`,
    customKeys > 0 ? `${customKeys} tombol diubah` : "Tombol bawaan",
    ...(muted ? ["Suara bisu"] : []),
  ];

  return (
    <p
      role="status"
      className="absolute bottom-32 left-1/2 max-w-[90vw] -translate-x-1/2 truncate rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-[10px] text-slate-300 backdrop-blur-sm sm:bottom-36"
    >
      <span className="mr-1.5 text-emerald-300">Pengaturan dimuat</span>
      {parts.join(" · ")}
    </p>
  );
}
