import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { ApiError } from "@/server/api/http";
import { playerLoadouts, weapons, type WeaponRow } from "@/server/db/schema";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";
import {
  WEAPON_UNLOCK_RULES,
  computeOwnership,
  unlockLabel,
  type WeaponOwnership,
  type WeaponProgress,
} from "@/lib/game/weapon-unlock";
import { getAchievementStats } from "@/server/services/player-stats-service";
import type { Weapon } from "@/types/game";

/**
 * Katalog senjata di server. Kode adalah sumber kebenarannya; tabel `weapons`
 * diisi/diperbarui sekali per proses supaya layanan lain (kerusakan, upgrade,
 * pembukaan senjata, riwayat) membaca satu sumber yang sama.
 */

let catalogSynced = false;

export function syncWeaponCatalog(): void {
  if (catalogSynced) return;
  db.transaction((tx) => {
    MOCK_WEAPONS.forEach((weapon, index) => {
      const rule = WEAPON_UNLOCK_RULES.find((item) => item.weaponId === weapon.id);
      const values = {
        name: weapon.name,
        type: weapon.type,
        damage: Math.round(weapon.damage),
        fireRate: Math.round(weapon.fireRate),
        magazineSize: weapon.magazineSize,
        reloadMs: Math.round(weapon.reloadSeconds * 1000),
        automatic: weapon.automatic,
        pellets: weapon.pellets,
        spreadCentiDeg: Math.round(weapon.spreadDegrees * 100),
        recoilCentiDeg: Math.round(weapon.recoilDegrees * 100),
        unlockStat: rule?.stat ?? null,
        unlockTarget: rule?.target ?? null,
        sortOrder: index,
      };
      tx.insert(weapons)
        .values({ id: weapon.id, ...values })
        .onConflictDoUpdate({ target: weapons.id, set: values })
        .run();
    });
  });
  catalogSynced = true;
}

export interface CatalogWeapon extends Weapon {
  /** Syarat membuka; null bila terbuka sejak awal. */
  unlock: { stat: NonNullable<WeaponRow["unlockStat"]>; target: number; label: string } | null;
}

export function toCatalogWeapon(row: WeaponRow): CatalogWeapon {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    damage: row.damage,
    fireRate: row.fireRate,
    magazineSize: row.magazineSize,
    reloadSeconds: row.reloadMs / 1000,
    automatic: row.automatic,
    pellets: row.pellets,
    spreadDegrees: row.spreadCentiDeg / 100,
    recoilDegrees: row.recoilCentiDeg / 100,
    imageUrl: null,
    unlock:
      row.unlockStat && row.unlockTarget
        ? { stat: row.unlockStat, target: row.unlockTarget, label: unlockLabel(row.unlockStat, row.unlockTarget) }
        : null,
  };
}

/** Seluruh katalog senjata, urut seperti di kode. */
export function listWeaponCatalog(): CatalogWeapon[] {
  syncWeaponCatalog();
  return db.select().from(weapons).orderBy(asc(weapons.sortOrder)).all().map(toCatalogWeapon);
}

/** Satu senjata dari katalog, atau null bila tidak dikenal. */
export function findCatalogWeapon(weaponId: string): CatalogWeapon | null {
  syncWeaponCatalog();
  const row = db.select().from(weapons).where(eq(weapons.id, weaponId)).get();
  return row ? toCatalogWeapon(row) : null;
}

export interface PlayerWeapon extends CatalogWeapon {
  ownership: WeaponOwnership;
}

/** Kemajuan membuka senjata dari statistik pertandingan pemain yang sungguhan. */
export function getWeaponProgress(playerId: number): WeaponProgress {
  const stats = getAchievementStats(playerId);
  return { wins: stats.wins, totalKills: stats.totalKills };
}

/** Katalog senjata lengkap dengan kepemilikan pemain. */
export function listPlayerWeapons(playerId: number): { weapons: PlayerWeapon[]; progress: WeaponProgress } {
  const progress = getWeaponProgress(playerId);
  return {
    progress,
    // Syarat dibaca dari katalog di database, bukan dari kode klien.
    weapons: listWeaponCatalog().map((weapon) => ({ ...weapon, ownership: computeOwnership(weapon.id, progress, weapon.unlock) })),
  };
}

/** Senjata bawaan loadout: senapan serbu, yang selalu terbuka sejak awal. */
export const DEFAULT_LOADOUT_WEAPON_ID = "wpn-rifle-garuda";

/**
 * Senjata utama di loadout pemain. Bila tersimpan senjata yang kini tidak
 * lagi terbuka (mis. syaratnya berubah), yang dikembalikan senjata bawaan.
 */
export function getWeaponLoadout(playerId: number): { primaryWeaponId: string; updatedAt: number | null } {
  syncWeaponCatalog();
  const row = db.select().from(playerLoadouts).where(eq(playerLoadouts.playerId, playerId)).get();
  if (!row) return { primaryWeaponId: DEFAULT_LOADOUT_WEAPON_ID, updatedAt: null };
  const unlocked = computeOwnership(
    row.primaryWeaponId,
    getWeaponProgress(playerId),
    findCatalogWeapon(row.primaryWeaponId)?.unlock,
  ).isUnlocked;
  return { primaryWeaponId: unlocked ? row.primaryWeaponId : DEFAULT_LOADOUT_WEAPON_ID, updatedAt: row.updatedAt };
}

/**
 * Menyimpan senjata utama loadout. Senjata harus ada di katalog (404) dan
 * sudah terbuka bagi pemain (409 senjata_terkunci).
 */
export function saveWeaponLoadout(playerId: number, weaponId: string): { primaryWeaponId: string; updatedAt: number } {
  const weapon = findCatalogWeapon(weaponId);
  if (!weapon) throw new ApiError(404, "senjata_tidak_ada", "Senjata tidak dikenal.");
  const ownership = computeOwnership(weaponId, getWeaponProgress(playerId), weapon.unlock);
  if (!ownership.isUnlocked) {
    throw new ApiError(409, "senjata_terkunci", `${weapon.name} masih terkunci: ${ownership.requirement}.`);
  }
  const updatedAt = Date.now();
  db.insert(playerLoadouts)
    .values({ playerId, primaryWeaponId: weaponId, updatedAt })
    .onConflictDoUpdate({ target: playerLoadouts.playerId, set: { primaryWeaponId: weaponId, updatedAt } })
    .run();
  return { primaryWeaponId: weaponId, updatedAt };
}

/** Kepemilikan satu senjata dengan syarat dari katalog database. */
export function catalogOwnership(weaponId: string, progress: WeaponProgress): WeaponOwnership {
  return computeOwnership(weaponId, progress, findCatalogWeapon(weaponId)?.unlock ?? null);
}
