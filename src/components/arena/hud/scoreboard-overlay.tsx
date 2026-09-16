"use client";

import { useEffect, useMemo } from "react";
import { usePlayerStore } from "@/lib/store/player-store";
import type { Fighter, RoundState } from "@/types/game";

/** Rasio kill per mati, dengan pembagi nol diperlakukan sebagai satu. */
function killRatio(fighter: Fighter): string {
  return (fighter.kills / Math.max(1, fighter.deaths)).toFixed(2);
}

/**
 * Papan skor penuh yang muncul selama Tab ditahan.
 *
 * Kolom utamanya adalah akumulasi kemenangan ronde sepanjang pertandingan —
 * itulah yang menentukan juara — dengan kill, mati, rasio, dan skor sebagai
 * rinciannya.
 */
export function ScoreboardOverlay({
  fighters,
  round,
  pingMs,
}: {
  fighters: Fighter[];
  round: RoundState;
  pingMs: number;
}) {
  const isLocked = usePlayerStore((state) => state.isLocked);
  const scoreboardOpen = usePlayerStore((state) => state.scoreboardOpen);
  const setScoreboardOpen = usePlayerStore((state) => state.setScoreboardOpen);

  // Listener sendiri, bukan lewat drei KeyboardControls: listener di sana
  // bersifat passive sehingga Tab tetap akan memindahkan fokus. Tab hanya
  // dicegat saat kursor terkunci, supaya navigasi keyboard tetap utuh selama
  // pemain belum masuk arena.
  useEffect(() => {
    const onDown = (event: KeyboardEvent) => {
      if (event.code !== "Tab") return;
      if (!usePlayerStore.getState().isLocked) return;
      event.preventDefault();
      setScoreboardOpen(true);
    };
    const onUp = (event: KeyboardEvent) => {
      if (event.code !== "Tab") return;
      setScoreboardOpen(false);
    };

    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [setScoreboardOpen]);

  const ranked = useMemo(
    () =>
      [...fighters].sort(
        (a, b) =>
          b.roundWins - a.roundWins ||
          b.score - a.score ||
          b.kills - a.kills ||
          a.deaths - b.deaths,
      ),
    [fighters],
  );

  if (!isLocked || !scoreboardOpen) return null;

  const leaderWins = ranked[0]?.roundWins ?? 0;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center bg-slate-950/70 px-4 backdrop-blur-[2px]">
      <div className="w-full max-w-lg overflow-hidden rounded-xl border border-white/10 bg-slate-950/85">
        <div className="flex items-baseline justify-between border-b border-white/10 px-4 py-3">
          <div>
            <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">
              Papan skor
            </p>
            <p className="mt-0.5 text-sm text-slate-300">
              Ronde {Math.min(round.current, round.total)} dari {round.total}
              <span className="text-slate-600"> · </span>
              batas {round.scoreLimit} kill
            </p>
          </div>
          <p className="font-mono text-[11px] text-slate-500 tabular-nums">
            {pingMs} ms
          </p>
        </div>

        <table className="w-full text-left">
          <thead>
            <tr className="text-[10px] tracking-[0.15em] text-slate-500 uppercase">
              <th className="px-4 py-2 font-medium">Pemain</th>
              <th className="w-14 px-2 py-2 text-right font-medium">Ronde</th>
              <th className="w-12 px-2 py-2 text-right font-medium">Kill</th>
              <th className="w-12 px-2 py-2 text-right font-medium">Mati</th>
              <th className="w-14 px-2 py-2 text-right font-medium">K/M</th>
              <th className="w-16 px-4 py-2 text-right font-medium">Skor</th>
            </tr>
          </thead>
          <tbody>
            {ranked.map((fighter) => (
              <tr
                key={fighter.id}
                className={`border-t border-white/5 ${
                  fighter.isLocal ? "bg-sky-500/10" : ""
                } ${fighter.isAlive ? "" : "opacity-55"}`}
              >
                <td className="px-4 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: fighter.color }}
                      aria-hidden
                    />
                    <span
                      className={`truncate text-sm ${
                        fighter.isLocal
                          ? "font-semibold text-sky-200"
                          : "text-slate-200"
                      }`}
                    >
                      {fighter.name}
                    </span>
                    {fighter.roundWins > 0 && fighter.roundWins === leaderWins ? (
                      <span
                        className="text-[10px] text-amber-300"
                        title="Memimpin kemenangan ronde"
                      >
                        ★
                      </span>
                    ) : null}
                  </span>
                </td>
                <td className="px-2 py-2 text-right font-mono text-sm font-semibold text-amber-300 tabular-nums">
                  {fighter.roundWins}
                </td>
                <td className="px-2 py-2 text-right font-mono text-sm text-slate-100 tabular-nums">
                  {fighter.kills}
                </td>
                <td className="px-2 py-2 text-right font-mono text-sm text-slate-500 tabular-nums">
                  {fighter.deaths}
                </td>
                <td className="px-2 py-2 text-right font-mono text-sm text-slate-400 tabular-nums">
                  {killRatio(fighter)}
                </td>
                <td className="px-4 py-2 text-right font-mono text-sm text-slate-100 tabular-nums">
                  {fighter.score}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="border-t border-white/10 px-4 py-2 text-[11px] text-slate-500">
          Juara ditentukan oleh kemenangan ronde terbanyak.
        </p>
      </div>
    </div>
  );
}
