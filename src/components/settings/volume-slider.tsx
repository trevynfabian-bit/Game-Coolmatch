"use client";

import { useId } from "react";

/** Penggeser volume 0..100% dengan label dan angka. */
export function VolumeSlider({
  label,
  hint,
  value,
  disabled,
  onChange,
  onTest,
}: {
  label: string;
  hint: string;
  value: number;
  disabled?: boolean;
  onChange: (value: number) => void;
  onTest?: () => void;
}) {
  const id = useId();
  const percent = Math.round(value * 100);
  return (
    <div className={`rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 ${disabled ? "opacity-50" : ""}`}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={id} className="text-sm font-semibold text-white">
          {label}
        </label>
        <span className="font-mono text-sm text-slate-300 tabular-nums">{percent}%</span>
      </div>
      <p className="text-[11px] text-slate-500">{hint}</p>
      <div className="mt-2 flex items-center gap-3">
        <input
          id={id}
          type="range"
          min={0}
          max={100}
          step={5}
          value={percent}
          disabled={disabled}
          onChange={(event) => onChange(Number(event.target.value) / 100)}
          className="h-2 flex-1 cursor-pointer accent-emerald-400"
        />
        {onTest ? (
          <button
            type="button"
            onClick={onTest}
            disabled={disabled}
            className="rounded-md border border-white/15 px-2.5 py-1 text-[11px] font-semibold text-slate-300 hover:border-white/30"
          >
            Tes
          </button>
        ) : null}
      </div>
    </div>
  );
}
