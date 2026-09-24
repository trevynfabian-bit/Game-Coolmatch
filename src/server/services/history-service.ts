import { and, desc, eq, isNotNull, lt, ne, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { matchScores, matches } from "@/server/db/schema";
import { kd } from "@/lib/history/standings";
import { progressMatchesOf } from "@/server/services/progress-isolation";
import { getPlayerStats } from "@/server/services/player-stats-service";
import { toHistoryMatch } from "@/server/services/match-report-service";
import type { HistoryMatch, StandingRow } from "@/types/history";

/**
 * Riwayat pertandingan pemain: klasemen gabungan dan ringkasan statistik.
 * Hanya pertandingan sah yang dihitung (bukan uji coba); pertandingan yang
 * ditinggal tidak masuk klasemen, sama seperti aturan `buildStandings` di klien.
 */

export interface StandingsResult {
  standings: (StandingRow & { rank: number; kd: number })[];
  /** Jumlah pertandingan yang masuk hitungan klasemen. */
  matchesCounted: number;
  summary: ReturnType<typeof getPlayerStats>;
}

export function getAggregateStandings(playerId: number, { limit = 50 }: { limit?: number } = {}): StandingsResult {
  const counted = and(progressMatchesOf(playerId), ne(matches.result, "ditinggal"));
  const rows = db
    .select({
      name: matchScores.participantName,
      isBot: matchScores.isBot,
      matches: sql<number>`count(*)`,
      wins: sql<number>`coalesce(sum(case when ${matchScores.isWinner} then 1 else 0 end), 0)`,
      kills: sql<number>`coalesce(sum(${matchScores.kills}), 0)`,
      deaths: sql<number>`coalesce(sum(${matchScores.deaths}), 0)`,
      score: sql<number>`coalesce(sum(${matchScores.score}), 0)`,
      roundWins: sql<number>`coalesce(sum(${matchScores.roundWins}), 0)`,
    })
    .from(matchScores)
    .innerJoin(matches, eq(matches.id, matchScores.matchId))
    .where(counted)
    .groupBy(matchScores.participantName, matchScores.isBot)
    .all()
    .map((row) => ({
      name: row.name,
      isBot: row.isBot,
      matches: Number(row.matches),
      wins: Number(row.wins),
      kills: Number(row.kills),
      deaths: Number(row.deaths),
      score: Number(row.score),
      roundWins: Number(row.roundWins),
    }));

  // Urutan akhir sama dengan klien: menang, kill, lalu rasio K/M.
  const sorted = rows.sort((a, b) => b.wins - a.wins || b.kills - a.kills || kd(b) - kd(a));
  let rank = 0;
  const standings = sorted.slice(0, Math.max(1, Math.min(200, limit))).map((row, index) => {
    const prev = sorted[index - 1];
    if (!prev || prev.wins !== row.wins || prev.kills !== row.kills || kd(prev) !== kd(row)) rank = index + 1;
    return { ...row, rank, kd: Math.round(kd(row) * 100) / 100 };
  });

  const matchesCounted = Number(
    db.select({ value: sql<number>`count(*)` }).from(matches).where(counted).get()?.value ?? 0,
  );
  return { standings, matchesCounted, summary: getPlayerStats(playerId) };
}

export type HistoryMode = "semua" | "pertandingan" | "uji";

/**
 * Riwayat pertandingan yang sudah selesai, terbaru lebih dulu. Paginasi
 * memakai kursor `beforeId` (id pertandingan terakhir yang sudah tampil)
 * supaya pertandingan baru tidak menggeser halaman.
 */
export function listMatchHistory(
  playerId: number,
  { limit = 50, beforeId, mode = "semua" }: { limit?: number; beforeId?: number; mode?: HistoryMode } = {},
): { matches: HistoryMatch[]; nextBefore: number | null } {
  const conditions = [eq(matches.playerId, playerId), isNotNull(matches.endedAt)];
  if (mode === "pertandingan") conditions.push(eq(matches.isTrial, false));
  if (mode === "uji") conditions.push(eq(matches.isTrial, true));
  if (beforeId !== undefined) conditions.push(lt(matches.id, beforeId));
  const size = Math.max(1, Math.min(100, limit));
  const rows = db.select().from(matches).where(and(...conditions)).orderBy(desc(matches.id)).limit(size).all();
  return {
    matches: rows.map(toHistoryMatch),
    nextBefore: rows.length === size ? rows[rows.length - 1].id : null,
  };
}
