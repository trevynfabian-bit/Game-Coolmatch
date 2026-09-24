"use client";

import { SettingsShell } from "@/components/settings/settings-shell";
import { FOV_RANGE, QUALITY_PRESETS, useSettingsStore, type GraphicsQuality } from "@/lib/store/settings-store";

/**
 * Pengaturan grafis: preset kualitas, skala resolusi, sudut pandang, dan
 * pengukur FPS. Berlaku saat arena atau tempat latihan dibuka berikutnya
 * (sudut pandang dan FPS langsung).
 */
export function GraphicsSettingsPage() {
  const graphics = useSettingsStore((state) => state.graphics);
  const setGraphics = useSettingsStore((state) => state.setGraphics);
  const resetGraphics = useSettingsStore((state) => state.resetGraphics);

  return (
    <SettingsShell
      active="/pengaturan/grafis"
      title="Grafis"
      description="Turunkan kualitas bila arena terasa patah-patah; naikkan bila perangkatmu kuat."
    >
      <section aria-labelledby="judul-kualitas">
        <h2 id="judul-kualitas" className="mb-2 text-[11px] tracking-[0.2em] text-slate-400 uppercase">
          Kualitas
        </h2>
        <div className="grid gap-2 sm:grid-cols-3" role="radiogroup" aria-labelledby="judul-kualitas">
          {(Object.keys(QUALITY_PRESETS) as GraphicsQuality[]).map((id) => {
            const preset = QUALITY_PRESETS[id];
            const active = graphics.quality === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setGraphics({ quality: id })}
                className={`rounded-xl border p-3 text-left ${
                  active ? "border-emerald-400/70 bg-emerald-500/10" : "border-white/10 bg-slate-900/60 hover:border-white/25"
                }`}
              >
                <span className="block text-sm font-semibold text-white">{preset.label}</span>
                <span className="mt-1 block text-[11px] leading-relaxed text-slate-400">{preset.blurb}</span>
              </button>
            );
          })}
        </div>
      </section>

      <div className="mt-6 space-y-3">
        <div className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3">
          <div className="flex items-center justify-between">
            <label htmlFor="skala-resolusi" className="text-sm font-semibold text-white">
              Skala resolusi
            </label>
            <span className="font-mono text-sm text-slate-300 tabular-nums">{Math.round(graphics.resolutionScale * 100)}%</span>
          </div>
          <p className="text-[11px] text-slate-500">Di bawah 100% gambar sedikit buram tapi jauh lebih ringan.</p>
          <input
            id="skala-resolusi"
            type="range"
            min={50}
            max={100}
            step={5}
            value={Math.round(graphics.resolutionScale * 100)}
            onChange={(event) => setGraphics({ resolutionScale: Number(event.target.value) / 100 })}
            className="mt-2 w-full accent-emerald-400"
          />
        </div>

        <div className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3">
          <div className="flex items-center justify-between">
            <label htmlFor="sudut-pandang" className="text-sm font-semibold text-white">
              Sudut pandang (FOV)
            </label>
            <span className="font-mono text-sm text-slate-300 tabular-nums">{graphics.fov}°</span>
          </div>
          <p className="text-[11px] text-slate-500">Makin lebar makin banyak yang terlihat, tapi sasaran tampak lebih kecil.</p>
          <input
            id="sudut-pandang"
            type="range"
            min={FOV_RANGE.min}
            max={FOV_RANGE.max}
            step={1}
            value={graphics.fov}
            onChange={(event) => setGraphics({ fov: Number(event.target.value) })}
            className="mt-2 w-full accent-emerald-400"
          />
        </div>

        <label className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3">
          <span>
            <span className="block text-sm font-semibold text-white">Tampilkan pengukur FPS</span>
            <span className="block text-[11px] text-slate-500">Angka frame per detik di atas layar arena.</span>
          </span>
          <input
            type="checkbox"
            checked={graphics.showFps}
            onChange={(event) => setGraphics({ showFps: event.target.checked })}
            className="h-5 w-5 accent-emerald-400"
          />
        </label>
      </div>

      <button type="button" onClick={resetGraphics} className="mt-4 block text-xs text-slate-400 hover:text-slate-200">
        Kembalikan ke bawaan
      </button>
    </SettingsShell>
  );
}
