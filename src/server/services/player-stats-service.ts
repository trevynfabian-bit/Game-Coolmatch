import { and, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { coinTransactions, matchScores, matches, playerStats, type PlayerStatsRow } from "@/server/db/schema";
import type { PlayerAchievementStats } from "@/lib/game/killstreak";
import { progressMatchesOf } from "@/server/services/progress-isolation";

/**
 * Statistik kemajuan pemain dari riwayat pertandingan yang sudah selesai.
 * Latihan dan uji coba (is_trial) tidak dihitung, sesuai aturan bahwa mode
 * uji coba tidak mengubah progres.
 */
export function getAchievementStats(playerId: number): PlayerAchievementStats {
  const real = progressMatchesOf(playerId);

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

/**
 * Menghitung ulang penuh ringkasan statistik pemain dari pertandingan yang
 * sah lalu menyimpannya ke `player_stats`. Dipanggil setiap kali pertandingan
 * ditutup; aman dipanggil kapan saja karena tidak menambah, melainkan
 * menimpa dengan hasil hitung ulang.
 */
export function refreshPlayerStats(playerId: number): PlayerStatsRow {
  const real = progressMatchesOf(playerId);
  const summary = db
    .select({
      played: sql<number>`count(*)`,
      wins: sql<number>`coalesce(sum(case when ${matches.result} = 'menang' then 1 else 0 end), 0)`,
      losses: sql<number>`coalesce(sum(case when ${matches.result} = 'kalah' then 1 else 0 end), 0)`,
      draws: sql<number>`coalesce(sum(case when ${matches.result} = 'seri' then 1 else 0 end), 0)`,
      abandoned: sql<number>`coalesce(sum(case when ${matches.result} = 'ditinggal' then 1 else 0 end), 0)`,
      bestStreak: sql<number>`coalesce(max(${matches.bestStreak}), 0)`,
      lastPlayedAt: sql<number | null>`max(${matches.endedAt})`,
    })
    .from(matches)
    .where(real)
    .get();
  const scores = db
    .select({
      kills: sql<number>`coalesce(sum(${matchScores.kills}), 0)`,
      deaths: sql<number>`coalesce(sum(${matchScores.deaths}), 0)`,
      roundWins: sql<number>`coalesce(sum(${matchScores.roundWins}), 0)`,
    })
    .from(matchScores)
    .innerJoin(matches, eq(matches.id, matchScores.matchId))
    .where(and(real, eq(matchScores.isBot, false)))
    .get();
  const coins = db
    .select({ total: sql<number>`coalesce(sum(${coinTransactions.amount}), 0)` })
    .from(coinTransactions)
    .where(and(eq(coinTransactions.playerId, playerId), eq(coinTransactions.sourceType, "match"), sql`${coinTransactions.amount} > 0`))
    .get();

  const values = {
    matchesPlayed: Number(summary?.played ?? 0),
    wins: Number(summary?.wins ?? 0),
    losses: Number(summary?.losses ?? 0),
    draws: Number(summary?.draws ?? 0),
    abandoned: Number(summary?.abandoned ?? 0),
    kills: Number(scores?.kills ?? 0),
    deaths: Number(scores?.deaths ?? 0),
    roundWins: Number(scores?.roundWins ?? 0),
    bestStreak: Number(summary?.bestStreak ?? 0),
    coinsEarned: Number(coins?.total ?? 0),
    lastPlayedAt: summary?.lastPlayedAt == null ? null : Number(summary.lastPlayedAt),
    updatedAt: Date.now(),
  };
  return db
    .insert(playerStats)
    .values({ playerId, ...values })
    .onConflictDoUpdate({ target: playerStats.playerId, set: values })
    .returning()
    .get();
}

/** Ringkasan statistik tersimpan; dihitung saat itu juga bila belum pernah ada. */
export function getPlayerStats(playerId: number): PlayerStatsRow {
  return db.select().from(playerStats).where(eq(playerStats.playerId, playerId)).get() ?? refreshPlayerStats(playerId);
}
