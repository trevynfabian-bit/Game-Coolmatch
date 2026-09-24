import { and, eq, isNotNull, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { matchScores, matches } from "@/server/db/schema";
import { getPlayerUpgrades } from "@/server/services/shop-service";
import { getSkinCollection } from "@/server/services/skin-service";
import { listFavorites } from "@/server/services/favorite-service";
import { progressMatchesOf } from "@/server/services/progress-isolation";
import { evaluateWeaponUnlocks } from "@/server/services/weapon-unlock-service";

/**
 * Senjata milik pemain beserta semua yang melekat padanya: skin terpasang,
 * tingkat upgrade, favorit, dan catatan pemakaian di pertandingan sah
 * (pertandingan yang mencatat senjata itu sebagai senjata bawaan pemain).
 */

export interface WeaponUsage {
  matches: number;
  wins: number;
  kills: number;
  deaths: number;
}

export interface OwnedWeapon {
  weaponId: string;
  name: string;
  type: string;
  via: "bawaan" | "pencapaian";
  unlockedAt: number | null;
  isNew: boolean;
  isFavorite: boolean;
  skinId: string | null;
  upgradeLevels: { damage: number; accuracy: number; reload: number };
  attachments: number;
  usage: WeaponUsage;
}

function usageByWeapon(playerId: number): Map<string, WeaponUsage> {
  const rows = db
    .select({
      weaponId: matches.weaponId,
      matches: sql<number>`count(*)`,
      wins: sql<number>`coalesce(sum(case when ${matches.result} = 'menang' then 1 else 0 end), 0)`,
      kills: sql<number>`coalesce(sum(${matchScores.kills}), 0)`,
      deaths: sql<number>`coalesce(sum(${matchScores.deaths}), 0)`,
    })
    .from(matches)
    .innerJoin(matchScores, and(eq(matchScores.matchId, matches.id), eq(matchScores.isBot, false)))
    .where(and(progressMatchesOf(playerId), isNotNull(matches.weaponId)))
    .groupBy(matches.weaponId)
    .all();
  return new Map(
    rows.map((row) => [
      row.weaponId!,
      { matches: Number(row.matches), wins: Number(row.wins), kills: Number(row.kills), deaths: Number(row.deaths) },
    ]),
  );
}

export function listOwnedWeapons(playerId: number): OwnedWeapon[] {
  const { weapons } = evaluateWeaponUnlocks(playerId);
  const upgrades = new Map(getPlayerUpgrades(playerId).map((item) => [item.weaponId, item]));
  const equipped = getSkinCollection(playerId).equipped;
  const favorites = new Set(listFavorites(playerId));
  const usage = usageByWeapon(playerId);
  return weapons
    .filter((weapon) => weapon.ownership.isUnlocked)
    .map((weapon) => {
      const upgrade = upgrades.get(weapon.id);
      return {
        weaponId: weapon.id,
        name: weapon.name,
        type: weapon.type,
        via: weapon.via ?? "bawaan",
        unlockedAt: weapon.unlockedAt,
        isNew: weapon.isNew,
        isFavorite: favorites.has(`senjata:${weapon.id}`),
        skinId: equipped[weapon.id] ?? null,
        upgradeLevels: upgrade?.levels ?? { damage: 0, accuracy: 0, reload: 0 },
        attachments: upgrade?.ownedAttachmentIds.length ?? 0,
        usage: usage.get(weapon.id) ?? { matches: 0, wins: 0, kills: 0, deaths: 0 },
      };
    });
}
