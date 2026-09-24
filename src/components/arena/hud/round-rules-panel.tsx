import type { RoundState } from "@/types/game";

/**
 * Panel aturan ronde: berapa ronde, berapa lama tiap ronde, batas kill yang
 * mengakhiri ronde lebih cepat, dan cara menentukan juara. Tampil di layar
 * jeda (sebelum main dan saat Esc) supaya pemain tahu apa yang dikejar.
 */
export function RoundRulesPanel({ round }: { round: RoundState }) {
  const minutes = Math.round(round.durationSeconds / 60);
  return (
    <div className="mx-auto mt-6 max-w-sm rounded-lg border border-white/10 bg-slate-900/70 px-4 py-3 text-left">
      <p className="text-[10px] tracking-[0.2em] text-emerald-400 uppercase">Aturan pertandingan</p>
      <ul className="mt-2 space-y-1 text-xs text-slate-300">
        <li>
          <span className="font-semibold text-white">{round.total} ronde</span>, masing-masing{" "}
          {minutes >= 1 ? `${minutes} menit` : `${round.durationSeconds} detik`}.
        </li>
        <li>
          Ronde berakhir lebih cepat bila ada yang mencapai{" "}
          <span className="font-semibold text-white">{round.scoreLimit} kill</span>.
        </li>
        <li>Pemenang ronde: kill terbanyak di ronde itu.</li>
        <li>Juara: paling banyak menang ronde, lalu total kill.</li>
      </ul>
    </div>
  );
}

/**
 * Deret titik kecil di bawah header ronde: ronde yang sudah lewat, yang sedang
 * berjalan, dan yang tersisa.
 */
export function RoundPips({ round }: { round: RoundState }) {
  return (
    <div className="mt-1 flex justify-center gap-1" aria-hidden>
      {Array.from({ length: round.total }, (_, index) => {
        const number = index + 1;
        const done = number < round.current || round.status === "ended";
        const now = number === round.current && round.status !== "ended";
        return (
          <span
            key={number}
            className={`h-1 rounded-full ${now ? "w-4 bg-emerald-400" : done ? "w-2 bg-slate-400" : "w-2 bg-white/15"}`}
          />
        );
      })}
    </div>
  );
}
