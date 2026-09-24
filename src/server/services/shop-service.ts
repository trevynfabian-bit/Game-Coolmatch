import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  attachments,
  playerAttachments,
  playerUpgrades,
  weaponUpgrades,
} from "@/server/db/schema";
import { ATTACHMENTS, UPGRADE_TRACKS, UPGRADE_STAT_LABEL } from "@/lib/economy/upgrade-catalog";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";
import {
  spendCoins,
  type CoinTransactionView,
  type WalletView,
} from "@/server/services/coin-service";
import type {
  Attachment,
  AttachmentSlot,
  UpgradeStat,
  UpgradeTrack,
  WeaponUpgradeState,
} from "@/types/economy";
import type { Weapon, WeaponType } from "@/types/game";
import { applyUpgrades } from "@/lib/economy/weapon-modifiers";

/**
 * Layanan toko upgrade senjata: katalog dan kepemilikan pemain.
 *
 * Katalog di kode adalah sumber kebenaran. `syncCatalog` menyalinnya ke tabel
 * `weapon_upgrades` dan `attachments` sekali per proses, jadi mengubah harga
 * cukup di satu tempat dan database langsung mengikuti tanpa migrasi data.
 */

let catalogSynced = false;

export function syncCatalog(): void {
  if (catalogSynced) return;
  db.transaction((tx) => {
    for (const track of UPGRADE_TRACKS) {
      for (const tier of track.tiers) {
        tx.insert(weaponUpgrades)
          .values({
            weaponId: track.weaponId,
            stat: track.stat,
            level: tier.level,
            price: tier.price,
            bonusPercent: tier.bonusPercent,
          })
          .onConflictDoUpdate({
            target: [weaponUpgrades.weaponId, weaponUpgrades.stat, weaponUpgrades.level],
            set: { price: tier.price, bonusPercent: tier.bonusPercent },
          })
          .run();
      }
    }
    for (const item of ATTACHMENTS) {
      const values = {
        name: item.name,
        slot: item.slot,
        price: item.price,
        compatibleTypes: item.compatibleTypes,
        modifiers: item.modifiers as Record<string, number>,
      };
      tx.insert(attachments)
        .values({ id: item.id, ...values })
        .onConflictDoUpdate({ target: attachments.id, set: values })
        .run();
    }
  });
  catalogSynced = true;
}

export interface ShopCatalog {
  tracks: UpgradeTrack[];
  attachments: Attachment[];
}

/** Katalog yang dikirim ke klien, dibaca dari tabel yang sudah diselaraskan. */
export function getCatalog(): ShopCatalog {
  syncCatalog();

  const tierRows = db.select().from(weaponUpgrades).all();
  const byTrack = new Map<string, UpgradeTrack>();
  for (const row of tierRows) {
    const key = `${row.weaponId}:${row.stat}`;
    let track = byTrack.get(key);
    if (!track) {
      // Deskripsi adalah teks tampilan, jadi diambil dari katalog di kode.
      const source = UPGRADE_TRACKS.find((t) => t.weaponId === row.weaponId && t.stat === row.stat);
      track = {
        id: `upg-${row.weaponId}-${row.stat}`,
        weaponId: row.weaponId,
        stat: row.stat,
        label: UPGRADE_STAT_LABEL[row.stat],
        description: source?.description ?? "",
        tiers: [],
      };
      byTrack.set(key, track);
    }
    track.tiers.push({ level: row.level, price: row.price, bonusPercent: row.bonusPercent });
  }
  const tracks = [...byTrack.values()];
  for (const track of tracks) track.tiers.sort((a, b) => a.level - b.level);

  const attachmentRows = db.select().from(attachments).all();
  const descriptions = new Map(ATTACHMENTS.map((item) => [item.id, item.description]));

  return {
    tracks,
    attachments: attachmentRows.map((row) => ({
      id: row.id,
      name: row.name,
      slot: row.slot as AttachmentSlot,
      description: descriptions.get(row.id) ?? "",
      price: row.price,
      compatibleTypes: row.compatibleTypes as WeaponType[],
      modifiers: row.modifiers,
    })),
  };
}

/** Kepemilikan upgrade dan attachment pemain, satu entri per senjata yang pernah disentuh. */
export function getPlayerUpgrades(playerId: number): WeaponUpgradeState[] {
  const byWeapon = new Map<string, WeaponUpgradeState>();
  const stateFor = (weaponId: string) => {
    let state = byWeapon.get(weaponId);
    if (!state) {
      state = {
        weaponId,
        levels: { damage: 0, accuracy: 0, reload: 0 },
        ownedAttachmentIds: [],
        equipped: {},
      };
      byWeapon.set(weaponId, state);
    }
    return state;
  };

  for (const row of db.select().from(playerUpgrades).where(eq(playerUpgrades.playerId, playerId)).all()) {
    stateFor(row.weaponId).levels[row.stat as UpgradeStat] = row.level;
  }
  for (const row of db
    .select()
    .from(playerAttachments)
    .where(eq(playerAttachments.playerId, playerId))
    .orderBy(playerAttachments.purchasedAt)
    .all()) {
    const state = stateFor(row.weaponId);
    state.ownedAttachmentIds.push(row.attachmentId);
    if (row.isEquipped) state.equipped[row.slot as AttachmentSlot] = row.attachmentId;
  }

  return [...byWeapon.values()];
}

export class ShopError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ShopError";
  }
}

function weaponOrThrow(weaponId: string) {
  const weapon = MOCK_WEAPONS.find((item) => item.id === weaponId);
  if (!weapon) throw new ShopError(404, "senjata_tidak_ada", "Senjata tidak dikenal.");
  return weapon;
}

function stateOf(playerId: number, weaponId: string): WeaponUpgradeState {
  return (
    getPlayerUpgrades(playerId).find((item) => item.weaponId === weaponId) ?? {
      weaponId,
      levels: { damage: 0, accuracy: 0, reload: 0 },
      ownedAttachmentIds: [],
      equipped: {},
    }
  );
}

export interface PurchaseResult {
  weapon: WeaponUpgradeState;
  wallet: WalletView;
  transaction: CoinTransactionView | null;
}

/**
 * Membeli tingkat BERIKUTNYA satu statistik senjata.
 *
 * Harga dibaca dari tabel katalog, bukan dari klien. Pemeriksaan tingkat,
 * pemotongan koin, dan kenaikan tingkat terjadi di satu transaksi; bila koin
 * kurang, CoinError("saldo_kurang") dilempar dan tidak ada yang berubah.
 */
export function buyUpgrade(
  playerId: number,
  weaponId: string,
  stat: UpgradeStat,
  /**
   * Tingkat yang dimaksud klien. Bila diisi dan tidak sama dengan tingkat
   * berikutnya yang sebenarnya, pembelian ditolak — menjaga klik ganda atau tab
   * lama agar tidak diam-diam membeli tingkat di atasnya.
   */
  expectedLevel?: number,
): PurchaseResult {
  syncCatalog();
  const weapon = weaponOrThrow(weaponId);
  const current = stateOf(playerId, weaponId).levels[stat];
  if (expectedLevel !== undefined && expectedLevel !== current + 1) {
    throw new ShopError(
      409,
      "tingkat_berubah",
      `${UPGRADE_STAT_LABEL[stat]} ${weapon.name} sekarang tingkat ${current}; muat ulang toko lalu coba lagi.`,
    );
  }
  const tier = db
    .select()
    .from(weaponUpgrades)
    .where(
      and(
        eq(weaponUpgrades.weaponId, weaponId),
        eq(weaponUpgrades.stat, stat),
        eq(weaponUpgrades.level, current + 1),
      ),
    )
    .get();
  if (!tier) {
    throw new ShopError(409, "sudah_maksimal", `${UPGRADE_STAT_LABEL[stat]} ${weapon.name} sudah di tingkat maksimal.`);
  }

  const paid = spendCoins(
    playerId,
    {
      kind: "beli_upgrade",
      amount: tier.price,
      sourceType: "upgrade",
      sourceId: `${weaponId}:${stat}:${tier.level}`,
      note: `${UPGRADE_STAT_LABEL[stat]} Tk ${tier.level} · ${weapon.name}`,
    },
    (tx) => {
      tx.insert(playerUpgrades)
        .values({ playerId, weaponId, stat, level: tier.level, updatedAt: Date.now() })
        .onConflictDoUpdate({
          target: [playerUpgrades.playerId, playerUpgrades.weaponId, playerUpgrades.stat],
          set: { level: tier.level, updatedAt: Date.now() },
        })
        .run();
    },
  );

  return { weapon: stateOf(playerId, weaponId), wallet: paid.wallet, transaction: paid.transaction };
}

/**
 * Membeli attachment untuk satu senjata dan langsung memasangnya, melepas
 * attachment lain di slot yang sama.
 */
export function buyAttachment(playerId: number, weaponId: string, attachmentId: string): PurchaseResult {
  syncCatalog();
  const weapon = weaponOrThrow(weaponId);
  const item = db.select().from(attachments).where(eq(attachments.id, attachmentId)).get();
  if (!item) throw new ShopError(404, "attachment_tidak_ada", "Attachment tidak dikenal.");
  if (!item.compatibleTypes.includes(weapon.type)) {
    throw new ShopError(400, "tidak_cocok", `${item.name} tidak cocok untuk ${weapon.name}.`);
  }
  if (stateOf(playerId, weaponId).ownedAttachmentIds.includes(attachmentId)) {
    throw new ShopError(409, "sudah_dimiliki", `${item.name} untuk ${weapon.name} sudah kamu miliki.`);
  }

  const paid = spendCoins(
    playerId,
    {
      kind: "beli_attachment",
      amount: item.price,
      sourceType: "attachment",
      sourceId: `${weaponId}:${attachmentId}`,
      note: `${item.name} · ${weapon.name}`,
    },
    (tx) => {
      equipInTx(tx, playerId, weaponId, item.slot);
      tx.insert(playerAttachments)
        .values({
          playerId,
          weaponId,
          attachmentId,
          slot: item.slot,
          isEquipped: true,
          purchasedAt: Date.now(),
        })
        .run();
    },
  );

  return { weapon: stateOf(playerId, weaponId), wallet: paid.wallet, transaction: paid.transaction };
}

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Melepas attachment yang terpasang di slot ini, supaya slot kosong untuk yang baru. */
function equipInTx(tx: Tx, playerId: number, weaponId: string, slot: AttachmentSlot) {
  tx.update(playerAttachments)
    .set({ isEquipped: false })
    .where(
      and(
        eq(playerAttachments.playerId, playerId),
        eq(playerAttachments.weaponId, weaponId),
        eq(playerAttachments.slot, slot),
      ),
    )
    .run();
}

export interface EffectiveWeapon {
  weaponId: string;
  base: Weapon;
  effective: Weapon;
  upgrades: WeaponUpgradeState;
}

/**
 * Statistik efektif tiap senjata untuk pemain: statistik dasar yang sudah
 * dikenai upgrade dan attachment terpasang, dihitung dengan fungsi yang sama
 * dengan pratinjau di toko.
 */
export function getEffectiveWeapons(playerId: number): EffectiveWeapon[] {
  const owned = new Map(getPlayerUpgrades(playerId).map((item) => [item.weaponId, item]));
  return MOCK_WEAPONS.map((base) => {
    const upgrades = owned.get(base.id) ?? {
      weaponId: base.id,
      levels: { damage: 0, accuracy: 0, reload: 0 },
      ownedAttachmentIds: [],
      equipped: {},
    };
    return { weaponId: base.id, base, effective: applyUpgrades(base, upgrades), upgrades };
  });
}
