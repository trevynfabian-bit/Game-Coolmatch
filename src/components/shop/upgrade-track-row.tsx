"use client";

import { useState } from "react";
import { CoinIcon, formatCoins } from "@/components/economy/coin-badge";
import { useShopStore, type ShopResult } from "@/lib/store/shop-store";
import type { UpgradeTrack, WeaponUpgradeState } from "@/types/economy";

/**
 * Satu jalur peningkatan statistik bertingkat (mis. Kerusakan tingkat 1–3).
 *
 * Tangga tingkat menunjukkan apa yang sudah dimiliki, apa yang bisa dibeli
 * sekarang, dan apa yang menunggu sesudahnya. Hanya tingkat berikutnya yang
 * bisa dibeli — tingkat tidak bisa dilompati — dan pembeliannya butuh dua
 * klik supaya koin tidak hilang karena salah klik.
 */
export function UpgradeTrackRow({
  track,
  state,
  balance,
  accent,
  onResult,
}: {
  track: UpgradeTrack;
  state: WeaponUpgradeState;
  balance: number;
  accent: string;
  onResult: (result: ShopResult, success: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const pending = useShopStore((s) => s.pending);
  const buyUpgrade = useShopStore((s) => s.buyUpgrade);

  const level = state.levels[track.stat];
  const max = track.tiers.length;
  const next = track.tiers.find((tier) => tier.level === level + 1) ?? null;
  const current = track.tiers.find((tier) => tier.level === level) ?? null;
  const affordable = next ? balance >= next.price : false;
  const busy = pending !== null;
  const processing = pending === `upgrade:${state.weaponId}:${track.stat}`;

  async function buy() {
    if (!next) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    const result = await buyUpgrade(state.weaponId, track.stat);
    onResult(result, `${track.label} naik ke tingkat ${next.level} (+${next.bonusPercent}%).`);
  }

  return (
    <li className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100">{track.label}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{track.description}</p>
        </div>
        <span className="shrink-0 font-mono text-[11px] text-slate-500 tabular-nums">
          Tk {level}/{max}
        </span>
      </div>

      <ol className="mt-3 grid grid-cols-3 gap-1.5" aria-label={`Tingkat ${track.label}`}>
        {track.tiers.map((tier) => {
          const owned = tier.level <= level;
          const isNext = tier.level === level + 1;
          return (
            <li
              key={tier.level}
              aria-current={isNext ? "step" : undefined}
              className={`relative overflow-hidden rounded-md border px-2 py-1.5 text-[11px] ${
                owned
                  ? "border-transparent"
                  : isNext
                    ? "border-white/20 bg-white/5"
                    : "border-white/5 opacity-60"
              }`}
              style={owned ? { backgroundColor: `${accent}1f` } : undefined}
            >
              {owned ? (
                <span className="absolute inset-x-0 bottom-0 h-0.5" style={{ backgroundColor: accent }} aria-hidden />
              ) : null}
              <span className="flex items-center justify-between gap-1">
                <span className="font-semibold text-slate-200">Tk {tier.level}</span>
                <span className="font-mono tabular-nums" style={{ color: owned || isNext ? accent : "#94a3b8" }}>
                  +{tier.bonusPercent}%
                </span>
              </span>
              <span className="mt-0.5 block text-[10px] text-slate-400">
                {owned ? (
                  "Dimiliki"
                ) : (
                  <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                    <CoinIcon className="h-3 w-3" />
                    {formatCoins(tier.price)}
                  </span>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="text-slate-500">
          {current ? (
            <>
              Sekarang <span className="text-slate-200">+{current.bonusPercent}%</span>
            </>
          ) : (
            "Belum ditingkatkan"
          )}
          {next ? (
            <>
              <span className="text-slate-700"> → </span>
              <span style={{ color: accent }}>+{next.bonusPercent}%</span>
            </>
          ) : null}
        </span>

        {next ? (
          <span className="flex items-center gap-2">
            {confirming ? (
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="px-2 py-1 text-[11px] font-semibold text-slate-400 hover:text-slate-200"
              >
                Batal
              </button>
            ) : null}
            <button
              type="button"
              disabled={busy || !affordable}
              onClick={buy}
              onBlur={() => setConfirming(false)}
              title={affordable ? undefined : `Koin kurang ${next.price - balance}`}
              className={`inline-flex items-center gap-1 rounded-md px-3 py-1 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 disabled:cursor-not-allowed disabled:opacity-50 ${
                confirming
                  ? "bg-amber-400 text-slate-950 hover:bg-amber-300"
                  : "border border-amber-400/30 text-amber-200 hover:border-amber-400/60"
              }`}
            >
              {processing ? "Memproses…" : confirming ? `Yakin, naik ke Tk ${next.level}` : `Naik ke Tk ${next.level}`}
              <CoinIcon className="h-3 w-3" />
              <span className="font-mono tabular-nums">{formatCoins(next.price)}</span>
            </button>
          </span>
        ) : (
          <span className="rounded bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold tracking-[0.12em] text-emerald-300 uppercase">
            Maksimal
          </span>
        )}
      </div>
    </li>
  );
}
