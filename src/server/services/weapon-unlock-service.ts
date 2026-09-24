import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db/client";
import { playerWeapons, rewardNotifications, type PlayerWeaponRow } from "@/server/db/schema";
import { computeOwnership, type WeaponOwnership, type WeaponProgress } from "@/lib/game/weapon-unlock";
import { recordNotification } from "@/server/services/notification-service";
import { getWeaponProgress, listWeaponCatalog, type CatalogWeapon } from "@/server/services/weapon-service";

/**
 * Evaluasi pembukaan senjata. Syarat (dari katalog) dibandingkan dengan
 * statistik pemain yang sungguhan; senjata yang syaratnya baru terpenuhi
 * dicatat ke `player_weapons` beserta notifikasi "senjata". Senjata yang
 * sudah pernah terbuka tetap terbuka walau syaratnya kelak berubah.
 */

export interface EvaluatedWeapon extends CatalogWeapon {
  ownership: WeaponOwnership;
  unlockedAt: number | null;
  /** Jalan terbukanya menurut catatan; null bila belum terbuka. */
  via: PlayerWeaponRow["via"] | null;
  /** Terbuka tapi pemberitahuannya belum dilihat pemain. */
  isNew: boolean;
}

export interface UnlockEvaluation {
  progress: WeaponProgress;
  weapons: EvaluatedWeapon[];
  /** Senjata yang terbuka pada evaluasi ini. */
  newlyUnlocked: string[];
}

export function evaluateWeaponUnlocks(playerId: number): UnlockEvaluation {
  const progress = getWeaponProgress(playerId);
  const catalog = listWeaponCatalog();

  const newlyUnlocked = db.transaction((tx) => {
    const recorded = new Map<string, PlayerWeaponRow>(
      tx.select().from(playerWeapons).where(eq(playerWeapons.playerId, playerId)).all().map((row) => [row.weaponId, row]),
    );
    const fresh: string[] = [];
    const now = Date.now();
    for (const weapon of catalog) {
      if (recorded.has(weapon.id)) continue;
      if (!computeOwnership(weapon.id, progress, weapon.unlock).isUnlocked) continue;
      const isStarter = weapon.unlock === null;
      const inserted = tx
        .insert(playerWeapons)
        .values({
          playerId,
          weaponId: weapon.id,
          via: isStarter ? "bawaan" : "pencapaian",
          unlockedAt: now,
          // Senjata bawaan tidak perlu dirayakan.
          announcedAt: isStarter ? now : null,
        })
        .onConflictDoNothing()
        .run().changes;
      if (inserted > 0 && !isStarter) {
        fresh.push(weapon.id);
        recordNotification(
          {
            playerId,
            kind: "senjata",
            title: `Senjata baru: ${weapon.name}`,
            body: `Syarat "${weapon.unlock?.label}" terpenuhi. Pilih di layar senjata untuk membawanya ke arena.`,
            itemId: weapon.id,
            sourceId: `senjata:${weapon.id}`,
          },
          tx,
        );
      }
    }
    return fresh;
  });

  const rows = new Map(
    db.select().from(playerWeapons).where(eq(playerWeapons.playerId, playerId)).all().map((row) => [row.weaponId, row]),
  );
  const weapons = catalog.map((weapon) => {
    const row = rows.get(weapon.id);
    const computed = computeOwnership(weapon.id, progress, weapon.unlock);
    // Yang sudah tercatat terbuka tidak pernah dikunci ulang.
    const ownership: WeaponOwnership = row
      ? { weaponId: weapon.id, isUnlocked: true, requirement: null, progress: null, progressLabel: null }
      : computed;
    return {
      ...weapon,
      ownership,
      unlockedAt: row?.unlockedAt ?? null,
      via: row?.via ?? null,
      isNew: row != null && row.announcedAt == null,
    };
  });
  return { progress, weapons, newlyUnlocked };
}

/**
 * Menandai senjata baru sudah dilihat (satu senjata, atau semua bila
 * `weaponId` null): penanda "Baru" di koleksi hilang dan notifikasi senjatanya
 * ikut ditandai dilihat. Idempoten; mengembalikan jumlah senjata yang berubah.
 */
export function markWeaponsSeen(playerId: number, weaponId: string | null, at = Date.now()): number {
  return db.transaction((tx) => {
    const conditions = [eq(playerWeapons.playerId, playerId), isNull(playerWeapons.announcedAt)];
    if (weaponId) conditions.push(eq(playerWeapons.weaponId, weaponId));
    const changed = tx.update(playerWeapons).set({ announcedAt: at }).where(and(...conditions)).run().changes;

    const noteConditions = [
      eq(rewardNotifications.playerId, playerId),
      eq(rewardNotifications.kind, "senjata"),
      isNull(rewardNotifications.seenAt),
    ];
    if (weaponId) noteConditions.push(eq(rewardNotifications.itemId, weaponId));
    tx.update(rewardNotifications).set({ seenAt: at }).where(and(...noteConditions)).run();
    return changed;
  });
}
