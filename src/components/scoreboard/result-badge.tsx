import type { MatchResult } from "@/types/game";

/** Kata dan warna tiap hasil pertandingan, dipakai bersama daftar dan rincian. */
export const RESULT_STYLE: Record<
  MatchResult,
  { label: string; text: string; chip: string }
> = {
  menang: {
    label: "Menang",
    text: "text-emerald-300",
    chip: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
  },
  kalah: {
    label: "Kalah",
    text: "text-rose-300",
    chip: "border-rose-400/40 bg-rose-500/10 text-rose-300",
  },
  seri: {
    label: "Seri",
    text: "text-amber-300",
    chip: "border-amber-400/40 bg-amber-500/10 text-amber-300",
  },
  ditinggal: {
    label: "Ditinggal",
    text: "text-slate-400",
    chip: "border-white/15 bg-white/5 text-slate-400",
  },
};

/** Penanda hasil pertandingan berbentuk chip kecil. */
export function ResultBadge({ result }: { result: MatchResult }) {
  const style = RESULT_STYLE[result];
  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.12em] uppercase ${style.chip}`}
    >
      {style.label}
    </span>
  );
}
