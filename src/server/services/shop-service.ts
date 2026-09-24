import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  attachments,
  playerAttachments,
  playerUpgrades,
  weaponUpgrades,
} from "@/server/db/schema";
import { ATTACHMENTS, UPGRADE_TRACKS, UPGRADE_STAT_LABEL } from "@/lib/economy/upgrade-catalog";
import type {
  Attachment,
  AttachmentSlot,
  UpgradeStat,
  UpgradeTrack,
  WeaponUpgradeState,
} from "@/types/economy";
import type { WeaponType } from "@/types/game";

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
