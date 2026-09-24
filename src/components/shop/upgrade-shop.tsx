"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { NoticeToast, useNotice } from "@/components/economy/notice-toast";
import { AttachmentRow } from "@/components/shop/attachment-row";
import { ShopTabs } from "@/components/shop/shop-tabs";
import { StatComparison } from "@/components/shop/stat-comparison";
import { UpgradeTrackRow } from "@/components/shop/upgrade-track-row";
import { CoinBadge, CoinIcon, formatCoins } from "@/components/economy/coin-badge";
import { WeaponSilhouette } from "@/components/weapons/weapon-silhouette";
import {
  ATTACHMENT_SLOTS,
  ATTACHMENT_SLOT_LABEL,
  attachmentsFor,
  findAttachment,
  upgradeTracksFor,
} from "@/lib/economy/upgrade-catalog";
import { MOCK_WEAPONS, findWeapon } from "@/lib/mock/weapons";
import { upgradeStateOf, useShopStore, type ShopResult } from "@/lib/store/shop-store";
import { useWalletStore } from "@/lib/store/wallet-store";
import type { WeaponUpgradeState } from "@/types/economy";
import { WEAPON_SHAPES, WEAPON_TYPE_LABEL } from "@/lib/weapons/weapon-shape";

/**
 * Halaman toko upgrade senjata: pilih senjata di kiri, lalu lihat jalur
 * peningkatan statistik dan attachment yang cocok untuknya. Semua data masih
 * tiruan dari `useShopStore`, termasuk aksi beli tingkat statistik serta beli dan pasang attachment.
 */
export function UpgradeShop() {
  const [weaponId, setWeaponId] = useState(MOCK_WEAPONS[2]?.id ?? MOCK_WEAPONS[0].id);
  const wallet = useWalletStore((state) => state.wallet);
  const transactions = useWalletStore((state) => state.transactions);
  const upgrades = useShopStore((state) => state.upgrades);

  const weapon = useMemo(() => findWeapon(weaponId), [weaponId]);
  const state = upgradeStateOf(upgrades, weapon.id);
  const tracks = useMemo(() => upgradeTracksFor(weapon.id), [weapon.id]);
  const attachments = useMemo(() => attachmentsFor(weapon.type), [weapon.type]);
  const accent = WEAPON_SHAPES[weapon.type].accent;

  const [preview, setPreview] = useState<{ weaponId: string; state: WeaponUpgradeState; label: string } | null>(null);
  const handlePreview = (candidate: WeaponUpgradeState | null, label: string | null) =>
    setPreview(candidate && label ? { weaponId: candidate.weaponId, state: candidate, label } : null);
  // Pratinjau hanya berlaku untuk senjata yang sedang dibuka.
  const activePreview = preview && preview.weaponId === weapon.id ? preview : null;

  const { notice, show } = useNotice();
  const report = (result: ShopResult, success: string) =>
    show(result.ok ? { tone: "ok", text: success } : { tone: "error", text: result.message });

  const remainingCost = tracks.reduce(
    (sum, track) =>
      sum +
      track.tiers
        .filter((tier) => tier.level > state.levels[track.stat])
        .reduce((acc, tier) => acc + tier.price, 0),
    0,
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">Toko</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Upgrade Senjata</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            Belanjakan koin hasil bertanding untuk meningkatkan statistik senjata dan memasang
            attachment. Semua peningkatan tersimpan permanen di senjatamu.
          </p>
        </div>
        <CoinBadge balance={wallet.balance} />
      </header>

      <ShopTabs active="/toko" />

      <NoticeToast notice={notice} />

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <nav aria-label="Senjata" className="lg:self-start lg:sticky lg:top-6">
          <ul className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible lg:pb-0">
            {MOCK_WEAPONS.map((item) => {
              const active = item.id === weapon.id;
              const itemState = upgradeStateOf(upgrades, item.id);
              const totalLevels = Object.values(itemState.levels).reduce((a, b) => a + b, 0);
              return (
                <li key={item.id} className="shrink-0">
                  <button
                    type="button"
                    onClick={() => setWeaponId(item.id)}
                    aria-pressed={active}
                    className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                      active
                        ? "border-emerald-400/70 bg-emerald-500/10"
                        : "border-white/10 bg-slate-900/60 hover:border-white/25"
                    }`}
                  >
                    <span className="w-14" style={{ color: active ? WEAPON_SHAPES[item.type].accent : "#64748b" }}>
                      <WeaponSilhouette type={item.type} className="h-6 w-full" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-slate-100">{item.name}</span>
                      <span className="block text-[10px] text-slate-500">
                        {WEAPON_TYPE_LABEL[item.type]}
                        {totalLevels > 0 ? ` · ${totalLevels} upgrade` : ""}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 hidden lg:block">
            <StatComparison
              weapon={weapon}
              current={state}
              candidate={activePreview?.state ?? null}
              candidateLabel={activePreview?.label ?? null}
              accent={accent}
            />
          </div>
        </nav>

        <div className="space-y-8">
          <div className="lg:hidden">
            <StatComparison
              weapon={weapon}
              current={state}
              candidate={activePreview?.state ?? null}
              candidateLabel={activePreview?.label ?? null}
              accent={accent}
            />
          </div>
          <section aria-labelledby="judul-statistik">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="judul-statistik" className="text-[11px] tracking-[0.2em] text-slate-400 uppercase">
                Peningkatan statistik · <span style={{ color: accent }}>{weapon.name}</span>
              </h2>
              <p className="text-[11px] text-slate-500">
                {remainingCost > 0 ? (
                  <>
                    Sisa ke maksimal:{" "}
                    <span className="inline-flex items-center gap-1 font-mono text-amber-200 tabular-nums">
                      <CoinIcon className="h-3 w-3" />
                      {formatCoins(remainingCost)}
                    </span>
                  </>
                ) : (
                  <span className="text-emerald-300">Semua statistik sudah maksimal</span>
                )}
              </p>
            </div>
            <ul className="mt-3 space-y-2">
              {tracks.map((track) => (
                <UpgradeTrackRow
                  key={track.id}
                  track={track}
                  state={state}
                  balance={wallet.balance}
                  accent={accent}
                  onResult={report}
                  onPreview={handlePreview}
                />
              ))}
            </ul>
          </section>

          <section aria-labelledby="judul-attachment">
            <h2 id="judul-attachment" className="text-[11px] tracking-[0.2em] text-slate-400 uppercase">
              Attachment
            </h2>
            <div className="mt-3 space-y-4">
              {ATTACHMENT_SLOTS.map((slot) => {
                const inSlot = attachments.filter((item) => item.slot === slot);
                if (inSlot.length === 0) return null;
                return (
                  <div key={slot}>
                    <p className="mb-1.5 text-[10px] tracking-wider text-slate-500 uppercase">
                      {ATTACHMENT_SLOT_LABEL[slot]}
                    </p>
                    <ul className="space-y-1.5">
                      {inSlot.map((attachment) => (
                        <AttachmentRow
                          key={attachment.id}
                          attachment={attachment}
                          state={state}
                          balance={wallet.balance}
                          replacing={
                            state.equipped[slot] && state.equipped[slot] !== attachment.id
                              ? (findAttachment(state.equipped[slot]!)?.name ?? null)
                              : null
                          }
                          onResult={report}
                          onPreview={handlePreview}
                        />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </section>

          <section aria-labelledby="judul-belanja">
            <h2 id="judul-belanja" className="text-[11px] tracking-[0.2em] text-slate-400 uppercase">
              Mutasi koin terakhir
            </h2>
            <ul className="mt-3 divide-y divide-white/5 rounded-xl border border-white/10 bg-slate-900/40">
              {transactions.slice(0, 5).map((tx) => (
                <li key={tx.id} className="flex items-center justify-between gap-3 px-4 py-2 text-xs">
                  <span className="min-w-0 truncate text-slate-300">{tx.note}</span>
                  <span className="flex shrink-0 items-center gap-3 font-mono tabular-nums">
                    <span className={tx.amount > 0 ? "text-emerald-300" : "text-rose-300"}>
                      {tx.amount > 0 ? "+" : "−"}
                      {formatCoins(Math.abs(tx.amount))}
                    </span>
                    <span className="w-14 text-right text-slate-500">{formatCoins(tx.balanceAfter)}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <div className="flex flex-wrap gap-2 border-t border-white/10 pt-6">
            <Link href="/senjata" className="rounded-lg border border-white/15 px-5 py-2.5 text-sm font-semibold text-slate-200 hover:border-white/30 hover:bg-white/5">
              Ke pilih senjata
            </Link>
            <Link href="/" className="rounded-lg px-5 py-2.5 text-sm font-medium text-slate-400 hover:text-slate-200">
              Kembali ke menu
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
