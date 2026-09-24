import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { matchScores, matches } from "@/server/db/schema";
import type { PlayerAchievementStats } from "@/lib/game/killstreak";

/**
 * Statistik kemajuan pemain dari riwayat pertandingan yang sudah selesai.
 * Latihan dan uji coba (is_trial) tidak dihitung, sesuai aturan bahwa mode
 * uji coba tidak mengubah progres.
 */
export function getAchievementStats(playerId: number): PlayerAchievementStats {
  const real = and(eq(matches.playerId, playerId), eq(matches.isTrial, false), sql`${matches.endedAt} IS NOT NULL`);

  const kills = db
    .select({ total: sql<number>`coalesce(sum(${matchScores.kills}), 0)` })
    .from(matchScores)
    .innerJoin(matches, eq(matches.id, matchScores.matchId))
    .where(and(real, eq(matchScores.isBot, false)))
    .get();

  const summary = db
    .select({
      bestStreak: sql<number>`coalesce(max(${matches.bestStreak}), 0)`,
      wins: sql<number>`coalesce(sum(case when ${matches.result} = 'menang' then 1 else 0 end), 0)`,
    })
    .from(matches)
    .where(real)
    .get();

  return {
    totalKills: Number(kills?.total ?? 0),
    bestStreak: Number(summary?.bestStreak ?? 0),
    wins: Number(summary?.wins ?? 0),
  };
}
