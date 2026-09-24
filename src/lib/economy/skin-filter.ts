import { RARITY_ORDER } from "@/lib/economy/skin-catalog";
import type { Skin, SkinCollection, SkinRarity } from "@/types/economy";

/**
 * Saringan dan urutan katalog skin. Dipisah dari komponen supaya aturannya
 * bisa dipakai ulang (galeri koleksi memakai urutan yang sama).
 */

export type SkinRarityFilter = SkinRarity | "semua" | "negara";
export type SkinOwnershipFilter = "semua" | "dimiliki" | "belum";
export type SkinSort = "tingkat" | "tingkat_turun" | "harga_naik" | "harga_turun" | "nama";

export const SKIN_SORT_LABEL: Record<SkinSort, string> = {
  tingkat: "Tingkat: umum → gold",
  tingkat_turun: "Tingkat: gold → umum",
  harga_naik: "Harga termurah",
  harga_turun: "Harga termahal",
  nama: "Nama A–Z",
};

export interface SkinQuery {
  rarity: SkinRarityFilter;
  ownership: SkinOwnershipFilter;
  sort: SkinSort;
}

const rank = (skin: Skin) => RARITY_ORDER.indexOf(skin.rarity);

export function filterSkins(skins: Skin[], collection: SkinCollection, query: SkinQuery): Skin[] {
  const owned = new Set(collection.ownedSkinIds);
  const result = skins.filter((skin) => {
    if (query.rarity === "negara" && skin.country === null) return false;
    if (query.rarity !== "semua" && query.rarity !== "negara" && skin.rarity !== query.rarity) return false;
    if (query.ownership === "dimiliki" && !owned.has(skin.id)) return false;
    if (query.ownership === "belum" && owned.has(skin.id)) return false;
    return true;
  });

  const byName = (a: Skin, b: Skin) => a.name.localeCompare(b.name, "id");
  result.sort((a, b) => {
    switch (query.sort) {
      case "tingkat":
        return rank(a) - rank(b) || a.price - b.price || byName(a, b);
      case "tingkat_turun":
        return rank(b) - rank(a) || b.price - a.price || byName(a, b);
      case "harga_naik":
        return a.price - b.price || byName(a, b);
      case "harga_turun":
        return b.price - a.price || byName(a, b);
      case "nama":
        return byName(a, b);
    }
  });
  return result;
}

/** Mengelompokkan hasil per tingkat, dipakai saat urutan berdasarkan tingkat. */
export function groupByRarity(skins: Skin[]): { rarity: SkinRarity; skins: Skin[] }[] {
  const groups: { rarity: SkinRarity; skins: Skin[] }[] = [];
  for (const skin of skins) {
    const last = groups[groups.length - 1];
    if (last && last.rarity === skin.rarity) last.skins.push(skin);
    else groups.push({ rarity: skin.rarity, skins: [skin] });
  }
  return groups;
}
