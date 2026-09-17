"use client";

import { VOLUME_MAX, VOLUME_MIN } from "@/lib/game/settings";

/**
 * Penggeser volume beserta angkanya.
 *
 * Angkanya ditampilkan di sebelah penggeser, bukan hanya posisinya. Dua
 * penggeser yang terlihat "kira-kira sama" ternyata 60 dan 70, dan pemain yang
 * ingin menyamakan keduanya tidak punya cara melakukannya tanpa angka.
 *
 * Saat dibisukan, penggeser dimatikan alih-alih disembunyikan: angkanya tetap
 * terlihat, jadi jelas bahwa membunyikan kembali akan mengembalikan volume
 * yang sama, bukan memulai dari nol.
 */
export function VolumeSetting({
  id,
  label,
  value,
  onChange,
  disabled = false,
}: {
  id: string;
  /** Untuk pembaca layar; namanya sendiri sudah ditulis baris pemanggil. */
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className={`flex items-center gap-3 ${disabled ? "opacity-45" : ""}`}>
      <input
        id={id}
        type="range"
        min={VOLUME_MIN}
        max={VOLUME_MAX}
        step={5}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-1.5 w-full max-w-xs cursor-pointer appearance-none rounded-full bg-white/10 accent-emerald-400 disabled:cursor-not-allowed"
      />
      <span className="w-10 shrink-0 text-right font-mono text-xs text-slate-300 tabular-nums">
        {value}
      </span>
    </div>
  );
}
