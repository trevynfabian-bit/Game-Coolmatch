"use client";

import { useEffect, useMemo, useState } from "react";
import { CoinIcon, formatCoins } from "@/components/economy/coin-badge";
import { calculateMatchCoins, type MatchOutcome } from "@/lib/economy/coin-rules";
import { useKillstreakStore } from "@/lib/store/killstreak-store";
import { useServerMatchStore } from "@/lib/store/server-match-store";
import type { Difficulty, Fighter } from "@/types/game";

/** Angka yang menghitung naik dari nol, supaya koin terasa "masuk". */
function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    let frame = 0;
    const started = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - started) / durationMs);
      setValue(Math.round(target * (1 - (1 - t) ** 3)));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [target, durationMs]);
  return value;
}

/**
 * Ringkasan koin di layar akhir pertandingan.
 *
 * Angka resminya dari server (lihat finishServerMatch). Selama server masih
 * menghitung, yang tampil adalah perkiraan dari aturan yang sama; bila server
 * tidak terjangkau, perkiraan itu ditandai "belum tersimpan" supaya pemain
 * tidak mengira koinnya sudah masuk.
 */
export function CoinSummary({
  fighters,
  difficulty,
  matchWinner,
}: {
  fighters: Fighter[];
  difficulty: Difficulty;
  matchWinner: string | null;
}) {
  const status = useServerMatchStore((state) => state.status);
  const result = useServerMatchStore((state) => state.result);
  const bestStreak = useKillstreakStore((state) => state.bestStreak);
  const local = fighters.find((fighter) => fighter.isLocal);

  const estimate = useMemo(() => {
    const outcome: MatchOutcome = matchWinner === null ? "seri" : matchWinner === local?.name ? "menang" : "kalah";
    return calculateMatchCoins({
      outcome,
      difficulty,
      kills: local?.kills ?? 0,
      roundWins: local?.roundWins ?? 0,
      bestStreak,
    });
  }, [matchWinner, local, difficulty, bestStreak]);

  const official = result?.coins ?? null;
  const reward = official?.reward ?? estimate;
  const total = useCountUp(reward.total);

  if (official?.excluded) {
    return (
      <section className="mt-4 rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-center text-xs text-slate-400">
        Pertandingan uji coba tidak menghasilkan koin.
      </section>
    );
  }

  return (
    <section aria-labelledby="judul-ringkasan-koin" className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/5 px-4 py-3">
      <div className="flex items-center justify-between">
        <h3 id="judul-ringkasan-koin" className="text-[10px] tracking-[0.2em] text-amber-300 uppercase">
          Koin didapat
        </h3>
        <p className="flex items-center gap-1.5 font-mono text-2xl font-bold text-amber-200 tabular-nums" aria-live="polite">
          <CoinIcon className="h-5 w-5" />+{formatCoins(total)}
        </p>
      </div>

      <ul className="mt-2 space-y-1 text-xs">
        {reward.lines.map((line) => (
          <li key={line.kind} className="flex justify-between gap-3">
            <span className="text-slate-300">{line.label}</span>
            <span className="font-mono text-amber-200/90 tabular-nums">+{formatCoins(line.amount)}</span>
          </li>
        ))}
        {reward.multiplier !== 1 ? (
          <li className="flex justify-between gap-3 text-slate-500">
            <span>Pengali kesulitan</span>
            <span className="font-mono tabular-nums">×{reward.multiplier}</span>
          </li>
        ) : null}
      </ul>

      <p className="mt-2 border-t border-white/10 pt-2 text-[11px] text-slate-400">
        {status === "finished" && official ? (
          <>
            Saldo sekarang{" "}
            <span className="font-mono text-slate-200 tabular-nums">{formatCoins(official.wallet.balance)}</span>
            {official.alreadyAwarded ? " · sudah tercatat sebelumnya" : ""}
          </>
        ) : status === "offline" ? (
          <span className="text-rose-300/90">Server tidak terjangkau — koin ini belum tersimpan.</span>
        ) : (
          "Menghitung dan menyimpan koin…"
        )}
      </p>
    </section>
  );
}
