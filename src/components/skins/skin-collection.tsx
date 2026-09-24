"use client";

import Link from "next/link";
import { useMemo } from "react";
import { WalletBadge } from "@/components/economy/wallet-badge";
import { ShopTabs } from "@/components/shop/shop-tabs";
import { SkinnedWeapon } from "@/components/skins/skinned-weapon";
import { RARITY_META, RARITY_ORDER, SKINS, findSkin } from "@/lib/economy/skin-catalog";
import { filterSkins, groupByRarity } from "@/lib/economy/skin-filter";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";
import { useSkinStore } from "@/lib/store/skin-store";

/**
 * Daftar kepemilikan skin: semua skin yang sudah dibeli, di senjata mana
 * masing-masing terpasang, dan seberapa lengkap koleksi per tingkat.
 * Data masih dari `useSkinStore` (tiruan); nanti diisi /api/skin.
 */
export function SkinCollectionView() {
  const collection = useSkinStore((state) => state.collection);

  const owned = useMemo(
    () => filterSkins(SKINS, collection, { rarity: "semua", ownership: "dimiliki", sort: "tingkat_turun" }),
    [collection],
  );
  const groups = useMemo(() => groupByRarity(owned), [owned]);

  /** skinId → senjata tempat ia terpasang. */
  const equippedOn = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const [weaponId, skinId] of Object.entries(collection.equipped)) {
      const weapon = MOCK_WEAPONS.find((item) => item.id === weaponId);
      if (!weapon) continue;
      map.set(skinId, [...(map.get(skinId) ?? []), weapon.name]);
    }
    return map;
  }, [collection.equipped]);

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">Toko</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Skin Milikku</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            Semua skin yang sudah kamu beli tersimpan permanen di akunmu, lengkap dengan senjata
            tempat masing-masing terpasang.
          </p>
        </div>
        <WalletBadge />
      </header>

      <ShopTabs active="/toko/koleksi" />

      <section aria-label="Kelengkapan koleksi" className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {RARITY_ORDER.map((rarity) => {
          const total = SKINS.filter((skin) => skin.rarity === rarity).length;
          const have = owned.filter((skin) => skin.rarity === rarity).length;
          const meta = RARITY_META[rarity];
          return (
            <div key={rarity} className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
              <p className="text-[10px] tracking-[0.2em] uppercase" style={{ color: meta.color }}>
                {meta.label}
              </p>
              <p className="mt-1 font-mono text-lg font-semibold text-white tabular-nums">
                {have}
                <span className="text-sm text-slate-500"> / {total}</span>
              </p>
              <span className="mt-2 block h-1 overflow-hidden rounded-full bg-white/10">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${total ? (have / total) * 100 : 0}%`, backgroundColor: meta.color }}
                />
              </span>
            </div>
          );
        })}
      </section>

      <section aria-labelledby="judul-senjata-terpasang" className="mb-8">
        <h2 id="judul-senjata-terpasang" className="mb-3 text-[11px] tracking-[0.2em] text-slate-400 uppercase">
          Cat tiap senjata
        </h2>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {MOCK_WEAPONS.map((weapon) => {
            const skin = findSkin(collection.equipped[weapon.id]);
            return (
              <li key={weapon.id} className="flex items-center gap-3 rounded-lg border border-white/10 bg-slate-900/50 px-3 py-2">
                <span className="w-16 shrink-0 text-slate-500">
                  <SkinnedWeapon type={weapon.type} skin={skin} className="h-7 w-full" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-slate-100">{weapon.name}</span>
                  <span className="block truncate text-[11px]" style={{ color: skin ? RARITY_META[skin.rarity].color : "#64748b" }}>
                    {skin ? skin.name : "Cat pabrik"}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="judul-skin-dimiliki">
        <h2 id="judul-skin-dimiliki" className="mb-3 text-[11px] tracking-[0.2em] text-slate-400 uppercase">
          Skin dimiliki · {owned.length} dari {SKINS.length}
        </h2>
        {owned.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/15 px-6 py-10 text-center">
            <p className="text-sm text-slate-300">Belum ada skin di koleksimu.</p>
            <Link href="/toko/skin" className="mt-3 inline-block rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-amber-300">
              Lihat toko skin
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {groups.map((group) => (
              <div key={group.rarity}>
                <p className="mb-2 text-[10px] tracking-[0.2em] uppercase" style={{ color: RARITY_META[group.rarity].color }}>
                  {RARITY_META[group.rarity].label}
                </p>
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {group.skins.map((skin) => {
                    const on = equippedOn.get(skin.id) ?? [];
                    return (
                      <li key={skin.id} className="rounded-xl border border-white/10 bg-slate-900/60 p-3">
                        <span className="block rounded-lg bg-slate-950/60 px-2 py-3">
                          <SkinnedWeapon type="rifle" skin={skin} className="h-10 w-full" />
                        </span>
                        <p className="mt-2 truncate text-sm font-semibold text-slate-100">{skin.name}</p>
                        <p className="truncate text-[11px] text-slate-500">
                          {on.length > 0 ? `Terpasang: ${on.join(", ")}` : "Belum dipasang"}
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
