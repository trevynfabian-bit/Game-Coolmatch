"use client";

import type { Fighter, MatchRoundResult, RoundState } from "@/types/game";

/** Sebab ronde berakhir, dibahasakan untuk papan. */
const REASON_LABEL: Record<MatchRoundResult["endedReason"], string> = {
  batas_kill: "batas kill tercapai",
  waktu_habis: "waktu ronde habis",
  ditinggal: "ronde ditinggalkan",
};

/**
 * Kedudukan ronde sejauh ini, hanya yang sudah pernah menang ronde: "Kamu 2 ·
 * Bot Ayu 1". Kosong bila belum ada yang memenangi satu ronde pun.
 */
export function standingLine(
  fighters: Pick<Fighter, "name" | "roundWins">[],
): string {
  return fighters
    .filter((fighter) => fighter.roundWins > 0)
    .sort((a, b) => b.roundWins - a.roundWins)
    .map((fighter) => `${fighter.name} ${fighter.roundWins}`)
    .join(" · ");
}

/** Klasemen ringkas: nama, ronde menang, dan kill ronde ini. */
function Standings({ fighters }: { fighters: Fighter[] }) {
  const ranked = [...fighters].sort(
    (a, b) =>
      b.roundWins - a.roundWins ||
      b.roundKills - a.roundKills ||
      a.deaths - b.deaths,
  );

  return (
    <ul className="mx-auto mt-5 w-full max-w-xs space-y-1">
      {ranked.map((fighter) => (
        <li
          key={fighter.id}
          className={`grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded px-2 py-1 text-xs ${
            fighter.isLocal ? "bg-sky-500/10" : ""
          }`}
        >
          <span className="flex min-w-0 items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: fighter.color }}
              aria-hidden
            />
            <span
              className={`truncate ${
                fighter.isLocal
                  ? "font-semibold text-sky-200"
                  : "text-slate-300"
              }`}
            >
              {fighter.name}
            </span>
          </span>
          <span className="w-10 text-right font-mono tabular-nums text-slate-100">
            {fighter.roundWins}
            <span className="ml-1 text-[10px] text-slate-500">ronde</span>
          </span>
          <span className="w-10 text-right font-mono tabular-nums text-slate-500">
            {fighter.roundKills}
            <span className="ml-1 text-[10px]">kill</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Papan besar di tengah layar saat ronde berganti. Akhir pertandingan ditangani
 * MatchEndScreen yang punya klasemen lengkap dan pilihan lanjut.
 */
export function RoundBanner({
  round,
  fighters,
  lastResult = null,
}: {
  round: RoundState;
  fighters: Fighter[];
  /** Catatan ronde yang baru saja ditutup, untuk menyebut sebab berakhirnya. */
  lastResult?: MatchRoundResult | null;
}) {
  if (round.status !== "intermission") return null;

  const kedudukan = standingLine(fighters);

  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-slate-950/70 px-6 backdrop-blur-[2px]">
      <div className="w-full max-w-sm text-center">
        <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">
          Ronde {round.current} selesai
          {lastResult ? (
            <span className="text-slate-500">
              {" "}
              · {REASON_LABEL[lastResult.endedReason]}
            </span>
          ) : null}
        </p>

        <p className="mt-3 text-2xl font-bold text-white">
          {round.lastRoundWinner
            ? `${round.lastRoundWinner} menang ronde ini`
            : "Ronde berakhir seri"}
        </p>

        {/* Kedudukan menuju gelar, supaya jeda ronde menjawab "siapa yang unggul". */}
        <p className="mt-1 text-xs text-slate-400">
          {kedudukan
            ? `Kedudukan ronde: ${kedudukan}`
            : "Belum ada yang memenangi ronde"}
          <span className="text-slate-600"> · </span>
          {round.total - round.current} ronde tersisa
        </p>

        <p className="mt-2 font-mono text-sm text-slate-300 tabular-nums">
          Ronde {round.current + 1} mulai dalam {Math.max(0, round.secondsLeft)}
          s
        </p>

        <Standings fighters={fighters} />
      </div>
    </div>
  );
}
