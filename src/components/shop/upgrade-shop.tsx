"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CoinBadge, CoinIcon, formatCoins } from "@/components/economy/coin-badge";
import { WeaponSilhouette } from "@/components/weapons/weapon-silhouette";
import {
  ATTACHMENT_SLOTS,
  ATTACHMENT_SLOT_LABEL,
  attachmentsFor,
  upgradeTracksFor,
} from "@/lib/economy/upgrade-catalog";
import { MOCK_WEAPONS, findWeapon } from "@/lib/mock/weapons";
import { upgradeStateOf, useShopStore } from "@/lib/store/shop-store";
import { WEAPON_SHAPES, WEAPON_TYPE_LABEL } from "@/lib/weapons/weapon-shape";
import type { Attachment, UpgradeTrack, WeaponUpgradeState } from "@/types/economy";

function LevelPips({ level, max, accent }: { level: number; max: number; accent: string }) {
  return (
    <span className="flex gap-1" aria-label={`Tingkat ${level} dari ${max}`}>
      {Array.from({ length: max }, (_, index) => (
        <span
          key={index}
          className="h-1.5 w-6 rounded-full"
          style={{ backgroundColor: index < level ? accent : "rgba(255,255,255,0.1)" }}
        />
      ))}
    </span>
  );
}

function PriceTag({ price, affordable }: { price: number; affordable: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 font-mono text-xs tabular-nums ${
        affordable ? "text-amber-200" : "text-rose-300/80"
      }`}
    >
      <CoinIcon className="h-3.5 w-3.5" />
      {formatCoins(price)}
    </span>
  );
}

function UpgradeRow({
  track,
  state,
  balance,
  accent,
}: {
  track: UpgradeTrack;
  state: WeaponUpgradeState;
  balance: number;
  accent: string;
}) {
  const level = state.levels[track.stat];
  const next = track.tiers.find((tier) => tier.level === level + 1) ?? null;
  const current = track.tiers.find((tier) => tier.level === level) ?? null;

  return (
    <li className="rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-100">{track.label}</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{track.description}</p>
        </div>
        <LevelPips level={level} max={track.tiers.length} accent={accent} />
      </div>
      <ol className="mt-3 grid grid-cols-3 gap-1.5" aria-label={`Tingkat ${track.label}`}>
        {track.tiers.map((tier) => {
          const owned = tier.level <= level;
          const isNext = tier.level === level + 1;
          return (
            <li
              key={tier.level}
              className={`rounded-md border px-2 py-1.5 text-[11px] ${
                owned
                  ? "border-transparent"
                  : isNext
                    ? "border-white/20 bg-white/5"
                    : "border-white/5 opacity-60"
              }`}
              style={owned ? { backgroundColor: `${accent}1f` } : undefined}
            >
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
      <div className="mt-3 flex items-center justify-between gap-3 text-xs">
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
          <span className="flex items-center gap-3">
            <PriceTag price={next.price} affordable={balance >= next.price} />
            <button
              type="button"
              disabled
              title="Pembelian menyusul"
              className="rounded-md border border-white/15 px-3 py-1 text-[11px] font-semibold text-slate-300 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Tingkat {next.level}
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

function AttachmentRow({
  attachment,
  state,
  balance,
}: {
  attachment: Attachment;
  state: WeaponUpgradeState;
  balance: number;
}) {
  const owned = state.ownedAttachmentIds.includes(attachment.id);
  const equipped = state.equipped[attachment.slot] === attachment.id;

  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2.5">
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-sm font-medium text-slate-100">
          {attachment.name}
          {equipped ? (
            <span className="rounded bg-emerald-400/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.12em] text-emerald-300 uppercase">
              Terpasang
            </span>
          ) : owned ? (
            <span className="rounded bg-sky-400/15 px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.12em] text-sky-300 uppercase">
              Dimiliki
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-[11px] leading-relaxed text-slate-400">{attachment.description}</p>
      </div>
      {owned ? null : <PriceTag price={attachment.price} affordable={balance >= attachment.price} />}
    </li>
  );
}

/**
 * Halaman toko upgrade senjata: pilih senjata di kiri, lalu lihat jalur
 * peningkatan statistik dan attachment yang cocok untuknya. Semua data masih
 * tiruan dari `useShopStore`; alur pembelian dan pratinjau efek menyusul.
 */
export function UpgradeShop() {
  const [weaponId, setWeaponId] = useState(MOCK_WEAPONS[2]?.id ?? MOCK_WEAPONS[0].id);
  const wallet = useShopStore((state) => state.wallet);
  const upgrades = useShopStore((state) => state.upgrades);

  const weapon = useMemo(() => findWeapon(weaponId), [weaponId]);
  const state = upgradeStateOf(upgrades, weapon.id);
  const tracks = useMemo(() => upgradeTracksFor(weapon.id), [weapon.id]);
  const attachments = useMemo(() => attachmentsFor(weapon.type), [weapon.type]);
  const accent = WEAPON_SHAPES[weapon.type].accent;
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
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
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

      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <nav aria-label="Senjata">
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
        </nav>

        <div className="space-y-8">
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
                <UpgradeRow key={track.id} track={track} state={state} balance={wallet.balance} accent={accent} />
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
                        <AttachmentRow key={attachment.id} attachment={attachment} state={state} balance={wallet.balance} />
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
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
