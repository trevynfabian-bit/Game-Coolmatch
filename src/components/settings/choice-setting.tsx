"use client";

import { useCallback, useRef } from "react";

export interface Choice<T extends string> {
  value: T;
  label: string;
}

/**
 * Sekelompok pilihan yang saling meniadakan, mis. tingkat kualitas gambar.
 *
 * Penandanya `role="radio"` di dalam `role="radiogroup"`, bukan tombol
 * tertekan: yang digambarkan memang satu pilihan dari sekian. Konsekuensinya
 * hanya pilihan aktif yang masuk urutan Tab, jadi tombol panah wajib
 * disediakan — tanpa itu pilihan lain tidak bisa dicapai dari papan ketik.
 */
export function ChoiceSetting<T extends string>({
  label,
  choices,
  value,
  onChange,
}: {
  label: string;
  choices: readonly Choice<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(
    0,
    choices.findIndex((choice) => choice.value === value),
  );

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const jumlah = choices.length;
      let tujuan: number;

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          tujuan = (index + 1) % jumlah;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          tujuan = (index - 1 + jumlah) % jumlah;
          break;
        case "Home":
          tujuan = 0;
          break;
        case "End":
          tujuan = jumlah - 1;
          break;
        default:
          return;
      }

      event.preventDefault();
      onChange(choices[tujuan].value);
      refs.current[tujuan]?.focus();
    },
    [choices, index, onChange],
  );

  return (
    <div
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
      className="flex flex-wrap gap-2"
    >
      {choices.map((choice, i) => {
        const active = choice.value === value;
        return (
          <button
            key={choice.value}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            ref={(element) => {
              refs.current[i] = element;
            }}
            onClick={() => onChange(choice.value)}
            className={`rounded-lg border px-3.5 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
              active
                ? "border-emerald-400/70 bg-emerald-500/10 text-emerald-200"
                : "border-white/15 text-slate-300 hover:border-white/30 hover:bg-white/5"
            }`}
          >
            {choice.label}
          </button>
        );
      })}
    </div>
  );
}
