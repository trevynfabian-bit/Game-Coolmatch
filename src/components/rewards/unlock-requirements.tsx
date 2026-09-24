"use client";

import { CoinIcon, formatCoins } from "@/components/economy/coin-badge";
import { achievementProgress, type KillstreakReward, type PlayerAchievementStats } from "@/lib/game/killstreak";

/**
 * Syarat membuka hadiah terkunci: harga koin, dan (bila ada) jalan pencapaian
 * beserta kemajuannya. Pemain cukup memenuhi SALAH SATU.
 */
export function UnlockRequirements({
  reward,
  price,
  stats,
  balance,
}: {
  reward: KillstreakReward;
  price: number;
  stats: PlayerAchievementStats;
  balance: number;
}) {
  const progress = achievementProgress(reward, stats);

  return (
    <div className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2.5">
      <p className="text-[10px] tracking-[0.2em] text-amber-300 uppercase">Cara membuka</p>
      <ul className="mt-1.5 space-y-2 text-xs">
        <li className="flex items-center justify-between gap-3">
          <span className="text-slate-300">Beli dengan koin</span>
          <span className={`inline-flex items-center gap-1 font-mono tabular-nums ${balance >= price ? "text-amber-200" : "text-rose-300/80"}`}>
            <CoinIcon className="h-3.5 w-3.5" />
            {formatCoins(price)}
          </span>
        </li>
        {progress ? (
          <li>
            <span className="flex items-center justify-between gap-3">
              <span className="text-slate-300">
                <span className="text-slate-500">atau </span>
                {progress.label}
              </span>
              <span className="font-mono text-[11px] text-slate-400 tabular-nums">
                {progress.current}/{progress.target}
              </span>
            </span>
            <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/10">
              <span className="block h-full rounded-full bg-amber-400/80" style={{ width: `${progress.ratio * 100}%` }} />
            </span>
          </li>
        ) : null}
      </ul>
    </div>
  );
}
