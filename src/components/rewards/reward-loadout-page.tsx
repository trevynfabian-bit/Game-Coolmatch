"use client";

import Link from "next/link";
import { KillstreakIcon } from "@/components/arena/hud/killstreak-tracker";
import { CoinIcon, formatCoins } from "@/components/economy/coin-badge";
import { WalletBadge } from "@/components/economy/wallet-badge";
import { useState } from "react";
import { SlotPicker } from "@/components/rewards/slot-picker";
import { KILLSTREAKS, type KillstreakId } from "@/lib/game/killstreak";
import { assignSlot, sameLoadout } from "@/lib/game/loadout-draft";
import { useKillstreakStore } from "@/lib/store/killstreak-store";

/**
 * Halaman Loadout Hadiah: tiga slot hadiah killstreak yang dibawa ke arena
 * (tombol 6, 7, 8) dan katalog semua hadiah beserta syarat dan status
 * terbukanya.
 */
export function RewardLoadoutPage() {
  const saved = useKillstreakStore((state) => state.loadout);
  const rewardStatus = useKillstreakStore((state) => state.rewardStatus);
  /**
   * Susunan yang sedang diatur di halaman ini. Diinisialisasi dari loadout
   * tersimpan, dan disetel ulang bila loadout tersimpan berubah (mis. baru
   * selesai dimuat dari server) selama belum ada perubahan di halaman.
   */
  const [draft, setDraft] = useState<(KillstreakId | null)[]>(saved);
  const [base, setBase] = useState(saved);
  if (base !== saved) {
    setBase(saved);
    if (sameLoadout(draft, base)) setDraft(saved);
  }
  const dirty = !sameLoadout(draft, saved);
  const loadout = draft;

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
          {draft.map((id, index) => (
            <li key={index}>
              <SlotPicker
                index={index}
                value={id}
                slots={draft}
                rewardStatus={rewardStatus}
                onChange={(next) => setDraft((current) => assignSlot(current, index, next))}
              />
            </li>
          ))}
        </ol>
        {dirty ? (
          <p className="mt-3 text-xs text-amber-300" role="status">
            Ada perubahan yang belum disimpan.
          </p>
        ) : null}
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
