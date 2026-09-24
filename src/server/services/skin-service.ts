import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { skins, type SkinRow } from "@/server/db/schema";
import { RARITY_ORDER, SKINS } from "@/lib/economy/skin-catalog";
import type { Skin, SkinRarity } from "@/types/economy";

/**
 * Layanan skin & camo: katalog bertingkat, kepemilikan, dan pemasangan.
 *
 * Seperti toko upgrade, katalog di kode adalah sumber kebenaran dan disalin
 * ke tabel `skins` sekali per proses.
 */

let catalogSynced = false;

export function syncSkinCatalog(): void {
  if (catalogSynced) return;
  db.transaction((tx) => {
    for (const skin of SKINS) {
      const values = {
        name: skin.name,
        rarity: skin.rarity,
        pattern: skin.pattern,
        colors: skin.colors,
        countryCode: skin.country?.code ?? null,
        countryName: skin.country?.name ?? null,
        price: skin.price,
      };
      tx.insert(skins)
        .values({ id: skin.id, ...values })
        .onConflictDoUpdate({ target: skins.id, set: values })
        .run();
    }
  });
  catalogSynced = true;
}

const descriptions = new Map(SKINS.map((skin) => [skin.id, skin.description]));

export function toSkin(row: SkinRow): Skin {
  return {
    id: row.id,
    name: row.name,
    rarity: row.rarity,
    pattern: row.pattern,
    colors: row.colors,
    country:
      row.countryCode && row.countryName ? { code: row.countryCode, name: row.countryName } : null,
    description: descriptions.get(row.id) ?? "",
    price: row.price,
  };
}

export interface SkinCatalogQuery {
  rarity?: SkinRarity;
  /** Hanya camo bertema negara. */
  countryOnly?: boolean;
}

/**
 * Katalog skin terurut dari umum ke gold lalu harga termurah, bisa disaring
 * per tingkat atau khusus tema negara.
 */
export function getSkinCatalog(query: SkinCatalogQuery = {}): Skin[] {
  syncSkinCatalog();
  const rows = (
    query.rarity
      ? db.select().from(skins).where(eq(skins.rarity, query.rarity))
      : db.select().from(skins)
  )
    .orderBy(asc(skins.price))
    .all();
  return rows
    .filter((row) => !query.countryOnly || row.countryCode !== null)
    .map(toSkin)
    .sort((a, b) => RARITY_ORDER.indexOf(a.rarity) - RARITY_ORDER.indexOf(b.rarity) || a.price - b.price);
}
