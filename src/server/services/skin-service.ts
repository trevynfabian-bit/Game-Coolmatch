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

/**
 * Memasang skin milik pemain ke satu senjata (menggantikan skin sebelumnya),
 * atau mengembalikan senjata ke cat pabrik bila `skinId` null. Gratis.
 */
export function setWeaponSkin(playerId: number, weaponId: string, skinId: string | null): SkinCollection {
  weaponOrThrow(weaponId);
  db.transaction((tx) => {
    if (skinId === null) {
      tx.delete(playerWeaponSkins)
        .where(and(eq(playerWeaponSkins.playerId, playerId), eq(playerWeaponSkins.weaponId, weaponId)))
        .run();
      return;
    }
    const owned = tx
      .select()
      .from(playerSkins)
      .where(and(eq(playerSkins.playerId, playerId), eq(playerSkins.skinId, skinId)))
      .get();
    if (!owned) throw new SkinError(409, "belum_dimiliki", "Beli dulu skin ini sebelum memasangnya.");
    equipInTx(tx, playerId, weaponId, skinId);
  });
  return getSkinCollection(playerId);
}

export interface OwnedSkinEntry {
  skin: Skin;
  purchasedAt: number;
  /** Nama id senjata tempat skin ini terpasang. */
  equippedOn: string[];
}

export interface SkinCollectionReport {
  owned: OwnedSkinEntry[];
  equipped: Record<string, string>;
  /** Kelengkapan per tingkat: dimiliki / total katalog. */
  completion: { rarity: SkinRarity; owned: number; total: number }[];
  totalOwned: number;
  totalCatalog: number;
}

/**
 * Daftar koleksi lengkap untuk halaman "Skin Milikku": tiap skin yang
 * dimiliki beserta detail katalognya, kapan dibeli, dan di senjata mana
 * terpasang; plus kelengkapan koleksi per tingkat. Urut dari gold ke umum,
 * lalu yang terbaru dibeli.
 */
export function getSkinCollectionReport(playerId: number): SkinCollectionReport {
  syncSkinCatalog();
  const rows = db
    .select({ skin: skins, purchasedAt: playerSkins.purchasedAt })
    .from(playerSkins)
    .innerJoin(skins, eq(skins.id, playerSkins.skinId))
    .where(eq(playerSkins.playerId, playerId))
    .all();
  const { equipped } = getSkinCollection(playerId);
  const equippedOn = new Map<string, string[]>();
  for (const [weaponId, skinId] of Object.entries(equipped)) {
    equippedOn.set(skinId, [...(equippedOn.get(skinId) ?? []), weaponId]);
  }

  const owned = rows
    .map((row) => ({
      skin: toSkin(row.skin),
      purchasedAt: row.purchasedAt,
      equippedOn: equippedOn.get(row.skin.id) ?? [],
    }))
    .sort(
      (a, b) =>
        RARITY_ORDER.indexOf(b.skin.rarity) - RARITY_ORDER.indexOf(a.skin.rarity) ||
        b.purchasedAt - a.purchasedAt,
    );

  const catalog = getSkinCatalog();
  return {
    owned,
    equipped,
    completion: RARITY_ORDER.map((rarity) => ({
      rarity,
      owned: owned.filter((entry) => entry.skin.rarity === rarity).length,
      total: catalog.filter((skin) => skin.rarity === rarity).length,
    })),
    totalOwned: owned.length,
    totalCatalog: catalog.length,
  };
}
