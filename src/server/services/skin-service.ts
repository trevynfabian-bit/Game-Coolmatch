import { and, asc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { playerSkins, playerWeaponSkins, skins, type SkinRow } from "@/server/db/schema";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";
import {
  spendCoins,
  type CoinTransactionView,
  type WalletView,
} from "@/server/services/coin-service";
import { RARITY_ORDER, SKINS } from "@/lib/economy/skin-catalog";
import type { Skin, SkinCollection, SkinRarity } from "@/types/economy";

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

export class SkinError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "SkinError";
  }
}

/** Koleksi skin pemain: yang dimiliki dan yang terpasang per senjata. */
export function getSkinCollection(playerId: number): SkinCollection {
  const owned = db
    .select({ skinId: playerSkins.skinId })
    .from(playerSkins)
    .where(eq(playerSkins.playerId, playerId))
    .orderBy(asc(playerSkins.purchasedAt))
    .all();
  const equippedRows = db
    .select()
    .from(playerWeaponSkins)
    .where(eq(playerWeaponSkins.playerId, playerId))
    .all();
  return {
    ownedSkinIds: owned.map((row) => row.skinId),
    equipped: Object.fromEntries(equippedRows.map((row) => [row.weaponId, row.skinId])),
  };
}

function weaponOrThrow(weaponId: string) {
  const weapon = MOCK_WEAPONS.find((item) => item.id === weaponId);
  if (!weapon) throw new SkinError(404, "senjata_tidak_ada", "Senjata tidak dikenal.");
  return weapon;
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

function equipInTx(tx: Tx, playerId: number, weaponId: string, skinId: string) {
  tx.insert(playerWeaponSkins)
    .values({ playerId, weaponId, skinId, updatedAt: Date.now() })
    .onConflictDoUpdate({
      target: [playerWeaponSkins.playerId, playerWeaponSkins.weaponId],
      set: { skinId, updatedAt: Date.now() },
    })
    .run();
}

export interface SkinPurchaseResult {
  collection: SkinCollection;
  wallet: WalletView;
  transaction: CoinTransactionView | null;
}

/**
 * Membeli skin dengan koin. Harga dari tabel katalog; pemotongan koin dan
 * pencatatan kepemilikan terjadi di satu transaksi. Bila `equipOn` diisi,
 * skin langsung dipasang di senjata itu dalam transaksi yang sama.
 */
export function buySkin(playerId: number, skinId: string, equipOn?: string): SkinPurchaseResult {
  syncSkinCatalog();
  const skin = db.select().from(skins).where(eq(skins.id, skinId)).get();
  if (!skin) throw new SkinError(404, "skin_tidak_ada", "Skin tidak dikenal.");
  if (equipOn) weaponOrThrow(equipOn);

  const already = db
    .select()
    .from(playerSkins)
    .where(and(eq(playerSkins.playerId, playerId), eq(playerSkins.skinId, skinId)))
    .get();
  if (already) throw new SkinError(409, "sudah_dimiliki", `${skin.name} sudah kamu miliki.`);

  const paid = spendCoins(
    playerId,
    {
      kind: "beli_skin",
      amount: skin.price,
      sourceType: "skin",
      sourceId: skin.id,
      note: `Skin ${skin.name}`,
    },
    (tx) => {
      tx.insert(playerSkins).values({ playerId, skinId, purchasedAt: Date.now() }).run();
      if (equipOn) equipInTx(tx, playerId, equipOn, skinId);
    },
  );

  return { collection: getSkinCollection(playerId), wallet: paid.wallet, transaction: paid.transaction };
}
