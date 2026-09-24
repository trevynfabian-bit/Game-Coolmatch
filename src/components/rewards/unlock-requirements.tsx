"use client";

import { CoinIcon, formatCoins } from "@/components/economy/coin-badge";
import { useState } from "react";
import { achievementProgress, type KillstreakReward, type PlayerAchievementStats } from "@/lib/game/killstreak";
import { useKillstreakStore } from "@/lib/store/killstreak-store";

/**
 * Syarat membuka hadiah terkunci: harga koin, dan (bila ada) jalan pencapaian
 * beserta kemajuannya. Pemain cukup memenuhi SALAH SATU.
 */
export function UnlockRequirements({
  reward,
  price,
  stats,
  balance,
  onResult,
}: {
  reward: KillstreakReward;
  price: number;
  stats: PlayerAchievementStats;
  balance: number;
  onResult: (result: { ok: true } | { ok: false; message: string }) => void;
}) {
  const progress = achievementProgress(reward, stats);
  const buyReward = useKillstreakStore((state) => state.buyReward);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function buy() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setBusy(true);
    const result = await buyReward(reward.id);
    setBusy(false);
    setConfirming(false);
    onResult(result);
  }

  return (
    <div className="mt-3 rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2.5">
      <p className="text-[10px] tracking-[0.2em] text-amber-300 uppercase">Cara membuka</p>
      <ul className="mt-1.5 space-y-2 text-xs">
        <li className="flex items-center justify-between gap-3">
          <span className="text-slate-300">Beli dengan koin</span>
          <button
            type="button"
            onClick={buy}
            onBlur={() => setConfirming(false)}
            disabled={busy || balance < price}
            title={balance < price ? `Koin kurang ${price - balance}` : undefined}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 font-mono text-xs tabular-nums disabled:cursor-not-allowed disabled:opacity-50 ${
              confirming ? "bg-amber-400 text-slate-950" : "border border-amber-400/30 text-amber-200 hover:border-amber-400/60"
            }`}
          >
            {busy ? "Membuka…" : confirming ? "Yakin, buka" : "Buka"}
            <CoinIcon className="h-3.5 w-3.5" />
            {formatCoins(price)}
          </button>
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
