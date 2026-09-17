import type { MatchRoundResult, RoundEndReason } from "@/types/game";

/** Nama pemain lokal, dipakai untuk menyorot ronde yang ia menangkan. */
const LOCAL_NAME = "Kamu";

const REASON_LABEL: Record<RoundEndReason, string> = {
  batas_kill: "batas kill tercapai",
  waktu_habis: "waktu ronde habis",
  ditinggal: "pertandingan ditinggal",
};

/**
 * Deretan hasil tiap ronde: siapa yang memenangkannya, dan ronde mana yang
 * berakhir seri.
 *
 * Tanpa ini, kedudukan ronde yang tidak berjumlah penuh — misalnya 2-2 dari
 * lima ronde — terbaca seperti angka yang hilang. Ronde seri diberi bentuk
 * sendiri supaya jelas bahwa rondenya memang dimainkan, hanya saja tidak ada
 * yang unggul sehingga tidak diberikan kepada siapa pun.
 */
export function RoundResultStrip({ rounds }: { rounds: MatchRoundResult[] }) {
  if (rounds.length === 0) return null;

  const drawn = rounds.filter((round) => round.winnerName === null).length;

  return (
    <div>
      <p className="mb-2 text-[9px] tracking-[0.15em] text-slate-500 uppercase">
        Hasil tiap ronde
      </p>

      <ol className="flex flex-wrap gap-1.5">
        {rounds.map((round) => {
          const isDraw = round.winnerName === null;
          const wonByPlayer = round.winnerName === LOCAL_NAME;

          return (
            <li
              key={round.roundNumber}
              title={`Ronde ${round.roundNumber} — ${
                isDraw ? "seri" : `dimenangkan ${round.winnerName}`
              }, ${REASON_LABEL[round.endedReason]}`}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] ${
                isDraw
                  ? "border-dashed border-amber-400/40 bg-amber-500/5"
                  : wonByPlayer
                    ? "border-emerald-400/40 bg-emerald-500/10"
                    : "border-white/10 bg-slate-900/50"
              }`}
            >
              <span className="font-mono text-[10px] text-slate-500 tabular-nums">
                R{round.roundNumber}
              </span>
              <span
                className={
                  isDraw
                    ? "font-medium text-amber-300"
                    : wonByPlayer
                      ? "font-medium text-emerald-300"
                      : "text-slate-300"
                }
              >
                {isDraw ? "Seri" : round.winnerName}
              </span>
            </li>
          );
        })}
      </ol>

      {drawn > 0 ? (
        <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
          {drawn === 1 ? "Satu ronde" : `${drawn} ronde`} berakhir seri dan tidak
          diberikan kepada siapa pun, jadi jumlah kemenangan ronde semua peserta
          lebih sedikit daripada ronde yang dimainkan.
        </p>
      ) : null}
    </div>
  );
}
