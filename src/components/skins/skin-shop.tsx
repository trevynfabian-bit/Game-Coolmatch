"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { CoinIcon, formatCoins } from "@/components/economy/coin-badge";
import { WalletBadge } from "@/components/economy/wallet-badge";
import { ShopTabs } from "@/components/shop/shop-tabs";
import { SkinnedWeapon } from "@/components/skins/skinned-weapon";
import { RARITY_META, RARITY_ORDER, SKINS, findSkin } from "@/lib/economy/skin-catalog";
import { MOCK_WEAPONS, findWeapon } from "@/lib/mock/weapons";
import { useSkinStore } from "@/lib/store/skin-store";
import { useWalletStore } from "@/lib/store/wallet-store";
import {
  SKIN_SORT_LABEL,
  filterSkins,
  groupByRarity,
  type SkinOwnershipFilter,
  type SkinRarityFilter,
  type SkinSort,
} from "@/lib/economy/skin-filter";
import type { Skin } from "@/types/economy";

const FILTERS: { id: SkinRarityFilter; label: string }[] = [
  { id: "semua", label: "Semua" },
  ...RARITY_ORDER.map((rarity) => ({ id: rarity, label: RARITY_META[rarity].label })),
  { id: "negara", label: "Tema negara" },
];

function RarityBadge({ skin }: { skin: Skin }) {
  const meta = RARITY_META[skin.rarity];
  return (
    <span
      className="rounded px-1.5 py-0.5 text-[9px] font-semibold tracking-[0.12em] uppercase"
      style={{ color: meta.color, backgroundColor: `${meta.color}1f` }}
    >
      {meta.label}
    </span>
  );
}

/**
 * Halaman toko skin & camo. Katalog bertingkat dari umum sampai gold, dengan
 * saringan kelangkaan dan tema negara. Tiap kartu menampilkan skin langsung di
 * atas siluet senjata yang sedang dipilih supaya pemain tahu hasilnya.
 */
export function SkinShop() {
  const [filter, setFilter] = useState<SkinRarityFilter>("semua");
  const [ownership, setOwnership] = useState<SkinOwnershipFilter>("semua");
  const [sort, setSort] = useState<SkinSort>("tingkat");
  const [weaponId, setWeaponId] = useState(MOCK_WEAPONS[2]?.id ?? MOCK_WEAPONS[0].id);
  const [focusId, setFocusId] = useState<string | null>(null);
  const collection = useSkinStore((state) => state.collection);
  const balance = useWalletStore((state) => state.wallet.balance);

  const weapon = useMemo(() => findWeapon(weaponId), [weaponId]);
  const equippedSkin = findSkin(collection.equipped[weapon.id]);
  const focused = findSkin(focusId) ?? equippedSkin ?? null;

  const visible = useMemo(
    () => filterSkins(SKINS, collection, { rarity: filter, ownership, sort }),
    [collection, filter, ownership, sort],
  );
  // Judul per tingkat hanya berarti bila urutannya memang per tingkat.
  const groups = useMemo(
    () =>
      sort === "tingkat" || sort === "tingkat_turun"
        ? groupByRarity(visible)
        : [{ rarity: null, skins: visible }],
    [visible, sort],
  );

  return (
    <div className="mx-auto w-full max-w-5xl px-5 py-10 sm:px-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[10px] tracking-[0.3em] text-emerald-400 uppercase">Toko</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-white">Skin &amp; Camo</h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-400">
            Cat senjatamu dari warna polos sampai lapisan emas, termasuk camo bertema bendera
            berbagai negara. Skin dibeli sekali dan bisa dipasang di senjata mana pun.
          </p>
        </div>
        <WalletBadge />
      </header>

      <ShopTabs active="/toko/skin" />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex gap-1 rounded-lg border border-white/10 p-0.5 text-xs" role="group" aria-label="Saring kepemilikan">
              {(
                [
                  ["semua", "Semua"],
                  ["belum", "Belum dimiliki"],
                  ["dimiliki", "Dimiliki"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setOwnership(id)}
                  aria-pressed={ownership === id}
                  className={`rounded-md px-2.5 py-1 font-medium ${
                    ownership === id ? "bg-white/10 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-400">
              Urutkan
              <select
                value={sort}
                onChange={(event) => setSort(event.target.value as SkinSort)}
                className="rounded-md border border-white/15 bg-slate-950 px-2 py-1 text-xs text-slate-100"
              >
                {(Object.keys(SKIN_SORT_LABEL) as SkinSort[]).map((key) => (
                  <option key={key} value={key}>
                    {SKIN_SORT_LABEL[key]}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Saring skin">
            {FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFilter(item.id)}
                aria-pressed={filter === item.id}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                  filter === item.id
                    ? "border-white/30 bg-white/10 text-white"
                    : "border-white/10 text-slate-400 hover:text-slate-200"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <p className="mb-3 text-[11px] text-slate-500" aria-live="polite">
            {visible.length} skin
            {visible.length === 0 ? " — tidak ada yang cocok dengan saringan ini." : null}
          </p>

          <div className="space-y-6">
            {groups.map((group) => (
              <section key={group.rarity ?? "semua"} aria-label={group.rarity ? RARITY_META[group.rarity].label : undefined}>
                {group.rarity ? (
                  <h2
                    className="mb-2 flex items-center gap-2 text-[11px] tracking-[0.2em] uppercase"
                    style={{ color: RARITY_META[group.rarity].color }}
                  >
                    {RARITY_META[group.rarity].label}
                    <span className="h-px flex-1" style={{ backgroundColor: `${RARITY_META[group.rarity].color}33` }} />
                    <span className="text-slate-500">{group.skins.length}</span>
                  </h2>
                ) : null}
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {group.skins.map((skin) => {
                    const owned = collection.ownedSkinIds.includes(skin.id);
                    const isEquipped = collection.equipped[weapon.id] === skin.id;
                    const meta = RARITY_META[skin.rarity];
                    return (
                      <li key={skin.id}>
                        <button
                          type="button"
                          onClick={() => setFocusId(skin.id)}
                          aria-pressed={focused?.id === skin.id}
                          className={`group w-full rounded-xl border p-3 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 ${
                            focused?.id === skin.id ? "bg-white/5" : "bg-slate-900/60 hover:bg-slate-900"
                          }`}
                          style={{
                            borderColor: focused?.id === skin.id ? meta.color : "rgba(255,255,255,0.1)",
                            boxShadow: skin.rarity === "gold" ? `0 0 18px ${meta.glow}` : undefined,
                          }}
                        >
                          <span className="block rounded-lg bg-slate-950/60 px-2 py-3 text-slate-500">
                            <SkinnedWeapon type={weapon.type} skin={skin} className="h-12 w-full" />
                          </span>
                          <span className="mt-2 flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-semibold text-slate-100">{skin.name}</span>
                            <RarityBadge skin={skin} />
                          </span>
                          <span className="mt-1 flex items-center justify-between text-[11px]">
                            <span className="truncate text-slate-500">{skin.country?.name ?? " "}</span>
                            {isEquipped ? (
                              <span className="text-emerald-300">Terpasang</span>
                            ) : owned ? (
                              <span className="text-sky-300">Dimiliki</span>
                            ) : (
                              <span
                                className={`inline-flex items-center gap-1 font-mono tabular-nums ${
                                  balance >= skin.price ? "text-amber-200" : "text-rose-300/80"
                                }`}
                              >
                                <CoinIcon className="h-3 w-3" />
                                {formatCoins(skin.price)}
                              </span>
                            )}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
            <label className="text-[10px] tracking-[0.2em] text-slate-400 uppercase" htmlFor="pilih-senjata-skin">
              Coba di senjata
            </label>
            <select
              id="pilih-senjata-skin"
              value={weapon.id}
              onChange={(event) => setWeaponId(event.target.value)}
              className="mt-2 w-full rounded-md border border-white/15 bg-slate-950 px-3 py-2 text-sm text-slate-100"
            >
              {MOCK_WEAPONS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>

            <div className="mt-4 rounded-lg bg-slate-950/60 px-3 py-6 text-slate-500">
              <SkinnedWeapon type={weapon.type} skin={focused} className="h-20 w-full" />
            </div>
            {focused ? (
              <div className="mt-3">
                <p className="flex items-center gap-2 text-base font-semibold text-white">
                  {focused.name} <RarityBadge skin={focused} />
                </p>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">{focused.description}</p>
              </div>
            ) : (
              <p className="mt-3 text-xs text-slate-400">
                {weapon.name} masih memakai cat pabrik. Pilih skin untuk melihat hasilnya.
              </p>
            )}
          </div>

          <Link href="/" className="block text-center text-xs font-medium text-slate-400 hover:text-slate-200">
            Kembali ke menu
          </Link>
        </aside>
      </div>
    </div>
  );
}
