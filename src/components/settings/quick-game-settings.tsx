"use client";

import { useState } from "react";
import { keepCursorFree } from "@/lib/game/keep-cursor-free";
import {
  FOV_RANGE,
  QUALITY_PRESETS,
  SENSITIVITY_RANGE,
  useSettingsStore,
  type GraphicsQuality,
} from "@/lib/store/settings-store";

/**
 * Pengaturan cepat di layar jeda: sensitivitas, sudut pandang, kualitas, dan
 * pengukur FPS. Semuanya menulis ke state pengaturan global yang sama dengan
 * halaman Pengaturan, jadi berlaku seketika begitu pemain kembali bermain.
 * Setiap klik ditahan supaya tidak memicu kunci kursor di belakangnya.
 */
export function QuickGameSettings() {
  const [open, setOpen] = useState(false);
  const graphics = useSettingsStore((state) => state.graphics);
  const sensitivity = useSettingsStore((state) => state.controls.sensitivity);
  const setGraphics = useSettingsStore((state) => state.setGraphics);
  const setControls = useSettingsStore((state) => state.setControls);

  return (
    <div className="pointer-events-auto mx-auto mt-3 max-w-sm text-left" onClick={keepCursorFree}>
      <button
        type="button"
        aria-expanded={open}
        onClick={(event) => {
          keepCursorFree(event);
          setOpen((value) => !value);
        }}
        className="w-full rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-left text-xs text-slate-300 hover:border-white/25"
      >
        {open ? "▾" : "▸"} Pengaturan cepat
        <span className="ml-2 text-[10px] text-slate-500">
          {sensitivity.toFixed(2)}× · FOV {graphics.fov}° · {QUALITY_PRESETS[graphics.quality].label}
        </span>
      </button>

      {open ? (
        <div className="mt-1.5 space-y-3 rounded-lg border border-white/10 bg-slate-900/80 px-3 py-3">
          <label className="block">
            <span className="flex justify-between text-[11px] text-slate-300">
              Sensitivitas mouse <span className="font-mono tabular-nums">{sensitivity.toFixed(2)}×</span>
            </span>
            <input
              type="range"
              min={SENSITIVITY_RANGE.min}
              max={SENSITIVITY_RANGE.max}
              step={SENSITIVITY_RANGE.step}
              value={sensitivity}
              onChange={(event) => setControls({ sensitivity: Number(event.target.value) })}
              className="mt-1 h-2 w-full accent-emerald-400"
            />
          </label>
          <label className="block">
            <span className="flex justify-between text-[11px] text-slate-300">
              Sudut pandang <span className="font-mono tabular-nums">{graphics.fov}°</span>
            </span>
            <input
              type="range"
              min={FOV_RANGE.min}
              max={FOV_RANGE.max}
              step={1}
              value={graphics.fov}
              onChange={(event) => setGraphics({ fov: Number(event.target.value) })}
              className="mt-1 h-2 w-full accent-emerald-400"
            />
          </label>
          <div>
            <p className="text-[11px] text-slate-300">Kualitas</p>
            <div className="mt-1 grid grid-cols-3 gap-1" role="radiogroup" aria-label="Kualitas grafis">
              {(Object.keys(QUALITY_PRESETS) as GraphicsQuality[]).map((id) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={graphics.quality === id}
                  onClick={(event) => {
                    keepCursorFree(event);
                    setGraphics({ quality: id });
                  }}
                  className={`rounded-md border px-2 py-1 text-[11px] ${
                    graphics.quality === id
                      ? "border-emerald-400/70 bg-emerald-500/15 text-emerald-200"
                      : "border-white/10 text-slate-300 hover:border-white/25"
                  }`}
                >
                  {QUALITY_PRESETS[id].label}
                </button>
              ))}
            </div>
            <p className="mt-1 text-[10px] text-slate-500">Bayangan dan resolusi berubah seketika; tepi halus menyusul saat arena dibuka lagi.</p>
          </div>
          <label className="flex items-center justify-between text-[11px] text-slate-300">
            Pengukur FPS
            <input
              type="checkbox"
              checked={graphics.showFps}
              onChange={(event) => setGraphics({ showFps: event.target.checked })}
              className="h-4 w-4 accent-emerald-400"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
