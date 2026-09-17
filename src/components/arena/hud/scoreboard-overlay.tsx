"use client";

import { useEffect, useMemo } from "react";
import {
  ScoreRow,
  ScoreTableHead,
  scoreRowFromFighter,
} from "@/components/scoreboard/score-row";
import { usePlayerStore } from "@/lib/store/player-store";
import type { Fighter, RoundState } from "@/types/game";

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
          <ScoreTableHead />
          <tbody>
            {ranked.map((fighter) => (
              <ScoreRow
                key={fighter.id}
                entry={scoreRowFromFighter(fighter, {
                  // Selama pertandingan berjalan bintangnya menandai siapa yang
                  // sedang memimpin, bukan juara — belum ada juara.
                  starTitle:
                    fighter.roundWins > 0 && fighter.roundWins === leaderWins
                      ? "Memimpin kemenangan ronde"
                      : null,
                })}
              />
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
