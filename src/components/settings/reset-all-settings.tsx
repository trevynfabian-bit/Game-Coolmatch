"use client";

import { useEffect, useRef, useState } from "react";
import { useMatchSetupStore } from "@/lib/store/match-setup-store";
import { useSettingsStore, type StoredSettings } from "@/lib/store/settings-store";
import type { Difficulty } from "@/types/game";

const UNDO_MS = 8000;

interface Snapshot {
  settings: StoredSettings;
  difficulty: Difficulty;
  botCount: number;
}

/**
 * Tombol kembalikan semua pengaturan ke bawaan: audio, grafis, kontrol (tata
 * tombol ikut), serta tingkat dan jumlah lawan. Perlu konfirmasi dulu, dan
 * sesudahnya ada kesempatan mengurungkan selama beberapa detik.
 */
export function ResetAllSettings() {
  const [confirming, setConfirming] = useState(false);
  const [undo, setUndo] = useState<Snapshot | null>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (confirming) confirmRef.current?.focus();
  }, [confirming]);

  useEffect(() => {
    if (!undo) return;
    const timer = setTimeout(() => setUndo(null), UNDO_MS);
    return () => clearTimeout(timer);
  }, [undo]);

  const resetEverything = () => {
    const settings = useSettingsStore.getState();
    const setup = useMatchSetupStore.getState();
    setUndo({
      settings: { audio: settings.audio, graphics: settings.graphics, controls: settings.controls },
      difficulty: setup.difficulty,
      botCount: setup.botCount,
    });
    settings.resetAll();
    setup.resetOpponents();
    setConfirming(false);
  };

  const undoReset = () => {
    if (!undo) return;
    useSettingsStore.getState().restore(undo.settings);
    const setup = useMatchSetupStore.getState();
    setup.setDifficulty(undo.difficulty);
    setup.setBotCount(undo.botCount);
    setUndo(null);
  };

  return (
    <section aria-labelledby="judul-reset" className="mt-8 rounded-xl border border-rose-400/20 bg-rose-950/10 px-4 py-3">
      <h2 id="judul-reset" className="text-sm font-semibold text-white">
        Kembalikan semua ke bawaan
      </h2>
      <p className="mt-0.5 text-[11px] text-slate-400">
        Audio, grafis, sensitivitas, tata tombol, serta tingkat dan jumlah lawan. Koin, koleksi, dan riwayat tidak tersentuh.
      </p>

      {confirming ? (
        <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Konfirmasi kembalikan ke bawaan">
          <span className="text-xs text-rose-200">Yakin? Semua pilihanmu di atas akan hilang.</span>
          <button
            ref={confirmRef}
            type="button"
            onClick={resetEverything}
            className="rounded-md bg-rose-500 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-400"
          >
            Ya, kembalikan
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-md border border-white/15 px-3 py-1 text-xs text-slate-300 hover:border-white/30"
          >
            Batal
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setUndo(null);
            setConfirming(true);
          }}
          className="mt-3 rounded-md border border-rose-400/40 px-3 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-500/10"
        >
          Kembalikan ke bawaan…
        </button>
      )}

      <p aria-live="polite" className="mt-2 min-h-4 text-xs text-emerald-300">
        {undo ? (
          <>
            Semua pengaturan kembali ke bawaan.{" "}
            <button type="button" onClick={undoReset} className="font-semibold underline underline-offset-2 hover:text-emerald-200">
              Urungkan
            </button>
          </>
        ) : null}
      </p>
    </section>
  );
}
