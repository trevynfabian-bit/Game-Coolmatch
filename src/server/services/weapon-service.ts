import { asc, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { weapons, type WeaponRow } from "@/server/db/schema";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";
import { WEAPON_UNLOCK_RULES } from "@/lib/mock/player-weapons";
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
  unlock: { stat: NonNullable<WeaponRow["unlockStat"]>; target: number } | null;
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
    unlock: row.unlockStat && row.unlockTarget ? { stat: row.unlockStat, target: row.unlockTarget } : null,
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
