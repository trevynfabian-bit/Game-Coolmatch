"use client";

import Link from "next/link";
import { KillstreakIcon } from "@/components/arena/hud/killstreak-tracker";
import { CoinIcon, formatCoins } from "@/components/economy/coin-badge";
import { WalletBadge } from "@/components/economy/wallet-badge";
import { KILLSTREAKS, LOADOUT_SLOTS, findKillstreak } from "@/lib/game/killstreak";
import { useKillstreakStore } from "@/lib/store/killstreak-store";

/**
 * Halaman Loadout Hadiah: tiga slot hadiah killstreak yang dibawa ke arena
 * (tombol 6, 7, 8) dan katalog semua hadiah beserta syarat dan status
 * terbukanya.
 */
export function RewardLoadoutPage() {
  const loadout = useKillstreakStore((state) => state.loadout);
  const rewardStatus = useKillstreakStore((state) => state.rewardStatus);

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10 sm:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">Persiapan bertanding</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Loadout Hadiah</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            Pilih hadiah killstreak yang kamu bawa ke arena. Kumpulkan kill beruntun tanpa tumbang
            untuk membukanya, lalu panggil dengan tombol 6, 7, atau 8.
          </p>
        </div>
        <WalletBadge />
      </header>

      <section aria-labelledby="judul-slot" className="mb-10">
        <h2 id="judul-slot" className="mb-3 text-[11px] tracking-[0.2em] text-slate-400 uppercase">
          Slot terpasang
        </h2>
        <ol className="grid gap-3 sm:grid-cols-3">
          {Array.from({ length: LOADOUT_SLOTS }, (_, index) => {
            const id = loadout[index] ?? null;
            const reward = id ? findKillstreak(id) : null;
            return (
              <li
                key={index}
                className="rounded-xl border bg-slate-900/60 p-4"
                style={{ borderColor: reward ? `${reward.color}66` : "rgba(255,255,255,0.1)" }}
              >
                <div className="flex items-center justify-between">
                  <span className="rounded bg-white/10 px-2 py-0.5 font-mono text-xs text-white">Tombol {6 + index}</span>
                  {reward ? (
                    <span className="font-mono text-[11px] text-slate-400">{reward.kills} kill</span>
                  ) : null}
                </div>
                {reward ? (
                  <div className="mt-4 flex items-center gap-3">
                    <span style={{ color: reward.color }}>
                      <KillstreakIcon id={reward.id} className="h-8 w-8" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-white">{reward.name}</span>
                      <span className="block text-[11px] text-slate-500">{reward.durationSeconds} detik</span>
                    </span>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-500">Slot kosong</p>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-labelledby="judul-katalog-hadiah">
        <h2 id="judul-katalog-hadiah" className="mb-3 text-[11px] tracking-[0.2em] text-slate-400 uppercase">
          Semua hadiah
        </h2>
        <ul className="space-y-3">
          {KILLSTREAKS.map((reward) => {
            const status = rewardStatus.find((item) => item.id === reward.id);
            const unlocked = status?.unlocked ?? reward.unlockPrice === 0;
            const slot = loadout.indexOf(reward.id);
            return (
              <li key={reward.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-slate-900/60 p-4">
                <span
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-slate-950/70"
                  style={{ color: unlocked ? reward.color : "#475569" }}
                >
                  <KillstreakIcon id={reward.id} className="h-7 w-7" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-semibold text-white">
                    {reward.name}
                    {slot >= 0 ? (
                      <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.12em] text-emerald-300 uppercase">
                        Tombol {6 + slot}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">{reward.blurb}</p>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {reward.kills} kill beruntun · aktif {reward.durationSeconds} detik
                  </p>
                </div>
                <div className="text-right">
                  {unlocked ? (
                    <span className="text-[11px] font-semibold tracking-wider text-emerald-300 uppercase">Terbuka</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 font-mono text-xs text-amber-200">
                      <CoinIcon className="h-3.5 w-3.5" />
                      {formatCoins(status?.unlockPrice ?? reward.unlockPrice)}
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="mt-10 flex flex-wrap gap-2 border-t border-white/10 pt-6">
        <Link href="/lawan" className="rounded-lg bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
          Lanjut atur lawan
        </Link>
        <Link href="/" className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200">
          Kembali ke menu
        </Link>
      </div>
    </div>
  );
}
