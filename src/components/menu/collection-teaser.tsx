"use client";

import Link from "next/link";
import { SkinnedWeapon } from "@/components/skins/skinned-weapon";
import { SKINS, findSkin } from "@/lib/economy/skin-catalog";
import { MOCK_WEAPONS, findWeapon } from "@/lib/mock/weapons";
import { weaponOwnership } from "@/lib/mock/player-weapons";
import { useFavoriteStore } from "@/lib/store/favorite-store";
import { useLoadoutStore } from "@/lib/store/loadout-store";
import { useSkinStore } from "@/lib/store/skin-store";

/**
 * Kartu kecil di menu utama yang mengintip koleksi pemain: senjata pilihan
 * dengan skin terpasangnya, jumlah skin dan favorit, dan jalan pintas ke galeri.
 */
export function CollectionTeaser() {
  const weaponId = useLoadoutStore((state) => state.selectedWeaponId);
  const collection = useSkinStore((state) => state.collection);
  const favorites = useFavoriteStore((state) => state.favorites);
  const weapon = findWeapon(weaponId);
  const skin = findSkin(collection.equipped[weapon.id]);

  const unlocked = MOCK_WEAPONS.filter(
    (item) => weaponOwnership(item.id).isUnlocked,
  ).length;

  return (
    <div className="mt-6">
      <Link
        href="/koleksi"
        className="group flex items-center gap-4 rounded-xl border border-white/10 bg-slate-900/60 px-4 py-3 text-left transition-colors hover:border-white/25 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
      >
        <span className="w-24 shrink-0 text-slate-400">
          <SkinnedWeapon
            type={weapon.type}
            skin={skin}
            className="h-9 w-full"
          />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[10px] tracking-[0.2em] text-emerald-400 uppercase">
            Galeri koleksi
          </span>
          <span className="block truncate text-sm font-semibold text-white">
            {weapon.name}
            <span className="text-slate-500">
              {" "}
              | {skin?.name ?? "Cat pabrik"}
            </span>
          </span>
          <span className="block text-[11px] text-slate-500">
            {collection.ownedSkinIds.length}/{SKINS.length} skin ·{" "}
            {favorites.length} favorit
          </span>
        </span>
        <span
          className="text-slate-500 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        >
          →
        </span>
      </Link>
      <Link
        href="/koleksi/senjata"
        className="mt-2 inline-block text-xs text-slate-400 hover:text-slate-200"
      >
        Koleksi senjata · {unlocked}/{MOCK_WEAPONS.length} dimiliki →
      </Link>
    </div>
  );
}
