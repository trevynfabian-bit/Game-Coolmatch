"use client";

import { keepCursorFree } from "@/lib/game/keep-cursor-free";
import { useEffect } from "react";
import { useSettingsStore } from "@/lib/store/settings-store";

/**
 * Kontrol volume ringkas untuk layar jeda: bisukan dan volume utama. Tombol M
 * membisukan/menyalakan suara kapan saja (kecuali saat mengetik di kolom isian).
 */
export function QuickAudioControl() {
  const audio = useSettingsStore((state) => state.audio);
  const setAudio = useSettingsStore((state) => state.setAudio);
  const toggleMute = useSettingsStore((state) => state.toggleMute);

  return (
    <div className="pointer-events-auto mx-auto mt-4 flex max-w-sm items-center gap-3 rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2">
      <button
        type="button"
        onClick={(event) => {
          keepCursorFree(event);
          toggleMute();
        }}
        aria-pressed={audio.muted}
        aria-label={audio.muted ? "Nyalakan suara" : "Bisukan suara"}
        className="rounded-md border border-white/15 px-2 py-1 text-xs text-slate-200 hover:border-white/30"
      >
        {audio.muted ? "🔇" : "🔊"} <span className="font-mono text-[10px] text-slate-500">M</span>
      </button>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={Math.round(audio.master * 100)}
        disabled={audio.muted}
        onClick={keepCursorFree}
        onChange={(event) => setAudio({ master: Number(event.target.value) / 100 })}
        aria-label="Volume utama"
        className="h-2 flex-1 accent-emerald-400"
      />
      <span className="w-9 text-right font-mono text-[11px] text-slate-400 tabular-nums">
        {audio.muted ? "bisu" : `${Math.round(audio.master * 100)}%`}
      </span>
    </div>
  );
}

/** Tombol M global untuk bisukan/nyalakan suara. */
export function MuteHotkey() {
  const toggleMute = useSettingsStore((state) => state.toggleMute);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (event.code === "KeyM" && !event.repeat) toggleMute();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleMute]);
  return null;
}
