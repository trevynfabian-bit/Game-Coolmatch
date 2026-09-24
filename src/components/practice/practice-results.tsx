"use client";

import { keepCursorFree } from "@/lib/game/keep-cursor-free";
import { RANGE_TARGETS } from "@/lib/practice/range-map";
import { accuracyPercent, usePracticeStore } from "@/lib/store/practice-store";

/** Nilai huruf sederhana dari ketepatan, supaya kemajuan terasa. */
export function practiceGrade(accuracy: number): { grade: string; note: string } {
  if (accuracy >= 80) return { grade: "S", note: "Nyaris tak meleset." };
  if (accuracy >= 60) return { grade: "A", note: "Bidikan mantap." };
  if (accuracy >= 40) return { grade: "B", note: "Lumayan — kurangi menembak sambil lari." };
  if (accuracy >= 20) return { grade: "C", note: "Coba tembak satu-satu, jangan ditahan." };
  return { grade: "D", note: "Pelan-pelan dulu: bidik, tahan napas, tembak." };
}

/**
 * Layar hasil latihan: ketepatan keseluruhan dengan nilai huruf, dan rincian
 * kena per sasaran menurut jarak. Ditandai jelas sebagai LATIHAN — hasilnya
 * tidak masuk statistik, tidak membuka senjata, dan tidak memberi koin.
 */
export function PracticeResults() {
  const shots = usePracticeStore((state) => state.shots);
  const hits = usePracticeStore((state) => state.hits);
  const perTarget = usePracticeStore((state) => state.perTarget);
  const reset = usePracticeStore((state) => state.reset);

  if (shots === 0) return null;
  const accuracy = accuracyPercent(shots, hits);
  const { grade, note } = practiceGrade(accuracy);
  const maxHits = Math.max(1, ...Object.values(perTarget));

  return (
    <section className="pointer-events-auto mt-4 rounded-xl border border-sky-400/30 bg-slate-900/80 p-4 text-left" aria-labelledby="judul-hasil-latihan">
      <div className="flex items-center justify-between">
        <h2 id="judul-hasil-latihan" className="text-[10px] tracking-[0.2em] text-sky-300 uppercase">
          Hasil latihan
        </h2>
        <span className="rounded bg-sky-400/15 px-1.5 py-0.5 text-[9px] font-bold tracking-[0.15em] text-sky-200 uppercase">
          Latihan · tidak dihitung
        </span>
      </div>
      <div className="mt-3 flex items-center gap-4">
        <span className="grid h-14 w-14 place-items-center rounded-xl bg-sky-400/10 font-mono text-3xl font-bold text-sky-200">
          {grade}
        </span>
        <span>
          <span className="block font-mono text-2xl font-semibold text-white tabular-nums">{accuracy.toFixed(0)}%</span>
          <span className="block text-xs text-slate-400">
            {hits} dari {shots} butir kena. {note}
          </span>
        </span>
      </div>
      <ul className="mt-3 space-y-1.5">
        {RANGE_TARGETS.map((target) => {
          const count = perTarget[target.id] ?? 0;
          return (
            <li key={target.id} className="flex items-center gap-2 text-[11px]">
              <span className="w-10 font-mono text-slate-400 tabular-nums">{target.distance} m</span>
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/10">
                <span className="block h-full rounded-full" style={{ width: `${(count / maxHits) * 100}%`, backgroundColor: target.color }} />
              </span>
              <span className="w-6 text-right font-mono text-slate-300 tabular-nums">{count}</span>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={(event) => {
          keepCursorFree(event);
          reset();
        }}
        className="mt-3 text-xs text-slate-400 hover:text-slate-200"
      >
        Ulang dari nol
      </button>
    </section>
  );
}
