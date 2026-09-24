import { eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { playerWeapons, type PlayerWeaponRow } from "@/server/db/schema";
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
    return { ...weapon, ownership, unlockedAt: row?.unlockedAt ?? null, isNew: row != null && row.announcedAt == null };
  });
  return { progress, weapons, newlyUnlocked };
}
