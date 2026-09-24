"use client";

import { useRef, useState } from "react";
import { KeyBindingPanel } from "@/components/settings/key-binding-panel";
import { SettingsShell } from "@/components/settings/settings-shell";
import {
  BASE_RADIANS_PER_PIXEL,
  SENSITIVITY_RANGE,
  useSettingsStore,
} from "@/lib/store/settings-store";

/** Derajat putaran pandangan untuk 100 piksel gerak mouse. */
function degreesPer100px(sensitivity: number): number {
  return (BASE_RADIANS_PER_PIXEL * 100 * sensitivity * 180) / Math.PI;
}

/**
 * Panel kontrol: sensitivitas pandangan mouse dengan penggeser dan bidang uji
 * kecil, lalu tata tombol yang bisa diganti. Berlaku di arena berikutnya.
 */
export function ControlSettingsPage() {
  const controls = useSettingsStore((state) => state.controls);
  const setControls = useSettingsStore((state) => state.setControls);
  const setSensitivity = (sensitivity: number) => setControls({ sensitivity });

  return (
    <SettingsShell
      active="/pengaturan/kontrol"
      title="Kontrol"
      description="Kecepatan pandangan mouse dan tombol untuk tiap aksi."
    >
      <div className="space-y-3">
        <div className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3">
          <div className="flex items-center justify-between">
            <label htmlFor="sensitivitas" className="text-sm font-semibold text-white">
              Sensitivitas mouse
            </label>
            <span className="font-mono text-sm text-slate-300 tabular-nums">{controls.sensitivity.toFixed(2)}×</span>
          </div>
          <p className="text-[11px] text-slate-500">
            Geser 100 piksel memutar pandangan sekitar {degreesPer100px(controls.sensitivity).toFixed(1)}°.
          </p>
          <input
            id="sensitivitas"
            type="range"
            min={SENSITIVITY_RANGE.min}
            max={SENSITIVITY_RANGE.max}
            step={SENSITIVITY_RANGE.step}
            value={controls.sensitivity}
            onChange={(event) => setSensitivity(Number(event.target.value))}
            className="mt-2 w-full accent-emerald-400"
          />
          <div className="mt-1 flex justify-between text-[10px] text-slate-500">
            <span>Lambat</span>
            <span>Cepat</span>
          </div>
        </div>

        <SensitivityTester sensitivity={controls.sensitivity} />
      </div>

      <button type="button" onClick={() => setSensitivity(1)} className="mt-4 block text-xs text-slate-400 hover:text-slate-200">
        Kembalikan sensitivitas bawaan
      </button>

      <KeyBindingPanel />
    </SettingsShell>
  );
}

/**
 * Bidang uji: gerakkan mouse di atasnya dan jarum kompas berputar sejauh
 * pandangan di arena akan berputar dengan sensitivitas saat ini.
 */
function SensitivityTester({ sensitivity }: { sensitivity: number }) {
  const [heading, setHeading] = useState(0);
  const last = useRef<number | null>(null);

  return (
    <div className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3">
      <p className="text-sm font-semibold text-white">Coba di sini</p>
      <p className="text-[11px] text-slate-500">Gerakkan mouse ke kiri-kanan di dalam kotak.</p>
      <div
        className="mt-2 flex h-32 cursor-ew-resize items-center justify-center rounded-lg border border-dashed border-white/15 bg-slate-950/60 select-none"
        onPointerMove={(event) => {
          const dx = last.current === null ? 0 : event.clientX - last.current;
          last.current = event.clientX;
          setHeading((value) => value + dx * BASE_RADIANS_PER_PIXEL * sensitivity);
        }}
        onPointerLeave={() => {
          last.current = null;
        }}
      >
        <div className="relative h-20 w-20 rounded-full border border-white/20">
          <div
            className="absolute top-1/2 left-1/2 h-9 w-0.5 origin-bottom rounded bg-emerald-400"
            style={{ transform: `translate(-50%, -100%) rotate(${heading}rad)` }}
          />
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] text-slate-500">U</span>
        </div>
      </div>
      <p className="mt-1 text-right font-mono text-[11px] text-slate-400 tabular-nums">
        {(((((heading * 180) / Math.PI) % 360) + 360) % 360).toFixed(0)}°
      </p>
    </div>
  );
}
