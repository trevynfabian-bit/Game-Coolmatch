"use client";

import type { Fighter, RoundState } from "@/types/game";

/** Klasemen ringkas: nama, ronde menang, dan kill ronde ini. */
function Standings({ fighters }: { fighters: Fighter[] }) {
  const ranked = [...fighters].sort(
    (a, b) =>
      b.roundWins - a.roundWins || b.roundKills - a.roundKills || a.deaths - b.deaths,
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
                fighter.isLocal ? "font-semibold text-sky-200" : "text-slate-300"
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
 * Papan besar di tengah layar saat ronde berganti atau pertandingan berakhir.
 * Ringkasan akhir yang lebih lengkap adalah bagian fase penilaian; di sini
 * cukup pemenang dan klasemen ronde.
 */
export function RoundBanner({
  round,
  fighters,
}: {
  round: RoundState;
  fighters: Fighter[];
}) {
  if (round.status !== "intermission" && round.status !== "ended") return null;

  const ended = round.status === "ended";

  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-slate-950/70 px-6 backdrop-blur-[2px]">
      <div className="w-full max-w-sm text-center">
        <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">
          {ended ? "Pertandingan selesai" : `Ronde ${round.current} selesai`}
        </p>

        <p className="mt-3 text-2xl font-bold text-white">
          {ended
            ? round.matchWinner
              ? `${round.matchWinner} juara`
              : "Pertandingan berakhir seri"
            : round.lastRoundWinner
              ? `${round.lastRoundWinner} menang ronde ini`
              : "Ronde berakhir seri"}
        </p>

        {ended ? (
          <p className="mt-2 text-xs text-slate-400">
            {round.total} ronde dimainkan di arena ini.
          </p>
        ) : (
          <p className="mt-2 font-mono text-sm text-slate-300 tabular-nums">
            Ronde {round.current + 1} mulai dalam {Math.max(0, round.secondsLeft)}s
          </p>
        )}

        <Standings fighters={fighters} />
      </div>
    </div>
  );
}
