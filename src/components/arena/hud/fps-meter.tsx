"use client";

import { usePlayerStore } from "@/lib/store/player-store";
import { useSettingsStore } from "@/lib/store/settings-store";

/**
 * Penghitung frame, di kolom tengah atas arena.
 *
 * Ada supaya pengaturan tampilan bisa dinilai, bukan ditebak: menurunkan
 * kualitas atau skala resolusi seharusnya menaikkan angka ini, dan tanpa
 * angkanya pemain hanya bisa merasa-rasa apakah ada bedanya.
 *
 * Warnanya ikut memberi kabar — di bawah tiga puluh, tersendatnya sudah terasa
 * di tangan saat membidik.
 */
export function FpsMeter() {
  const show = useSettingsStore((state) => state.display.showFps);
  const fps = usePlayerStore((state) => state.fps);

  if (!show) return null;

  const warna =
    fps >= 50
      ? "text-emerald-300"
      : fps >= 30
        ? "text-amber-300"
        : "text-rose-400";

  return (
    /*
      Di kolom tengah atas, di bawah panel ronde dan penanda uji coba.
      Sudut-sudut layar sudah penuh: papan skor langsung dan kill feed di atas,
      nyawa dan amunisi di bawah, dan ketiganya melebar mengikuti isinya
      sehingga angka kecil yang diselipkan di sana cepat atau lambat tertimpa.
      Kolom tengah di bawah panel ronde justru kosong pada semua lebar layar,
      dan di situ pula mata pemain sudah sering singgah.
    */
    <div className="pointer-events-none absolute top-[7rem] left-1/2 -translate-x-1/2 rounded-lg border border-white/10 bg-slate-950/70 px-2.5 py-1 backdrop-blur-sm">
      <p className="font-mono text-xs tabular-nums">
        <span className={warna}>{fps || "–"}</span>
        <span className="ml-1 text-[10px] text-slate-500">FPS</span>
      </p>
    </div>
  );
}
