"use client";

import Link from "next/link";
import { useMemo } from "react";
import { GalleryItemCard } from "@/components/gallery/gallery-item-card";
import { SkinnedWeapon } from "@/components/skins/skinned-weapon";
import { RARITY_META, findSkin } from "@/lib/economy/skin-catalog";
import { applyUpgrades } from "@/lib/economy/weapon-modifiers";
import { weaponOwnership } from "@/lib/mock/player-weapons";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";
import { upgradeStateOf, useShopStore } from "@/lib/store/shop-store";
import { useSkinStore } from "@/lib/store/skin-store";
import { unseenItemIds, useNotificationStore } from "@/lib/store/notification-store";
import { WEAPON_SHAPES, WEAPON_TYPE_LABEL } from "@/lib/weapons/weapon-shape";
import { weaponStatBars } from "@/lib/weapons/weapon-stats";

/**
 * Koleksi senjata: semua senjata dalam satu halaman — yang sudah dimiliki
 * dengan skin, tingkat upgrade, dan statistik efektifnya; yang belum dengan
 * syarat membukanya.
 */
export function WeaponCollectionPage() {
  const upgrades = useShopStore((state) => state.upgrades);
  const equipped = useSkinStore((state) => state.collection.equipped);
  const notifications = useNotificationStore((state) => state.items);
  const newWeapons = useMemo(() => unseenItemIds(notifications, "senjata"), [notifications]);

  const items = useMemo(
    () =>
      MOCK_WEAPONS.map((weapon) => {
        const ownership = weaponOwnership(weapon.id);
        const state = upgradeStateOf(upgrades, weapon.id);
        return {
          weapon,
          ownership,
          effective: applyUpgrades(weapon, state),
          levels: Object.values(state.levels).reduce((a, b) => a + b, 0),
          attachments: state.ownedAttachmentIds.length,
          skin: findSkin(equipped[weapon.id]) ?? null,
        };
      }),
    [upgrades, equipped],
  );
  const owned = items.filter((item) => item.ownership.isUnlocked).length;

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
      <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">Koleksi</p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Koleksi Senjata</h1>
      <p className="mt-2 mb-8 text-sm text-slate-400">
        {owned} dari {items.length} senjata dimiliki.{" "}
        <Link href="/koleksi" className="text-emerald-300 hover:underline">
          Lihat galeri lengkap
        </Link>
      </p>

      {owned === 0 ? (
        <div className="mb-8 rounded-xl border border-dashed border-white/15 px-6 py-8 text-center">
          <p className="text-sm text-slate-300">Belum ada senjata di koleksimu.</p>
          <p className="mt-1 text-xs text-slate-500">
            Menangi pertandingan dan kumpulkan kill untuk membuka senjata pertama. Sementara itu, coba dulu di mode uji coba.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Link href="/lawan" className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-emerald-400">
              Main sekarang
            </Link>
            <Link href="/uji" className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-slate-200 hover:border-white/30">
              Uji coba senjata
            </Link>
          </div>
        </div>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map(({ weapon, ownership, effective, levels, attachments, skin }) => {
          const locked = !ownership.isUnlocked;
          const bars = weaponStatBars(effective);
          return (
            <li key={weapon.id}>
              <GalleryItemCard
                status={locked ? "terkunci" : "dimiliki"}
                isNew={!locked && newWeapons.has(weapon.id)}
                preview={
                  <span className="block" style={{ color: WEAPON_SHAPES[weapon.type].accent }}>
                    <SkinnedWeapon type={weapon.type} skin={locked ? null : skin} className="h-16 w-full" />
                  </span>
                }
                title={weapon.name}
                tag={WEAPON_TYPE_LABEL[weapon.type]}
                caption={
                  locked ? (
                    <span className="text-amber-300/80">
                      {ownership.requirement} · {ownership.progressLabel}
                    </span>
                  ) : (
                    <span>
                      <span style={{ color: skin ? RARITY_META[skin.rarity].color : undefined }}>{skin?.name ?? "Cat pabrik"}</span>
                      {" · "}
                      {levels} upgrade · {attachments} attachment
                    </span>
                  )
                }
                details={
                  <div className="space-y-1.5">
                    {bars.map((bar) => (
                      <div key={bar.label} className="grid grid-cols-[4.5rem_1fr] items-center gap-2">
                        <span className="text-[10px] text-slate-500">{bar.label}</span>
                        <span className="h-1 overflow-hidden rounded-full bg-white/10">
                          <span
                            className="block h-full rounded-full"
                            style={{ width: `${bar.value * 100}%`, backgroundColor: WEAPON_SHAPES[weapon.type].accent }}
                          />
                        </span>
                      </div>
                    ))}
                  </div>
                }
              />
            </li>
          );
        })}
      </ul>
    </div>
  );
}
