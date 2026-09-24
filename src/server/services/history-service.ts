import { and, asc, desc, eq, isNotNull, lt, ne, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { matchKillEvents, matchScores, matches } from "@/server/db/schema";
import { ApiError } from "@/server/api/http";
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

export interface RoundKillLine {
  name: string;
  kills: number;
  headshots: number;
  deaths: number;
}

export interface RoundDetail {
  roundNumber: number;
  winnerName: string | null;
  endedReason: HistoryMatch["rounds"][number]["endedReason"];
  playerKills: number;
  /** Rincian kill per peserta dari kejadian yang tersinkron; kosong bila tidak ada. */
  lines: RoundKillLine[];
  headshots: number;
  totalKills: number;
}

/**
 * Rincian sebuah pertandingan per ronde: putusan tiap ronde (pemenang dan
 * sebab berakhir) digabung dengan kejadian kill yang tersinkron selama
 * pertandingan — siapa membunuh berapa, kena kepala, dan tumbang berapa kali.
 */
export function getMatchRoundDetail(playerId: number, matchId: number): { match: HistoryMatch; rounds: RoundDetail[] } {
  const row = db
    .select()
    .from(matches)
    .where(and(eq(matches.id, matchId), eq(matches.playerId, playerId)))
    .get();
  if (!row) throw new ApiError(404, "pertandingan_tidak_ada", "Pertandingan tidak ditemukan.");
  if (row.endedAt == null) {
    throw new ApiError(409, "pertandingan_belum_selesai", "Rincian baru tersedia setelah pertandingan selesai.");
  }
  const match = toHistoryMatch(row);
  const events = db
    .select()
    .from(matchKillEvents)
    .where(eq(matchKillEvents.matchId, matchId))
    .orderBy(asc(matchKillEvents.seq))
    .all();

  const rounds = match.rounds.map((round) => {
    const inRound = events.filter((event) => event.roundNumber === round.roundNumber);
    const table = new Map<string, RoundKillLine>();
    const line = (name: string) => {
      let found = table.get(name);
      if (!found) table.set(name, (found = { name, kills: 0, headshots: 0, deaths: 0 }));
      return found;
    };
    for (const event of inRound) {
      const killer = line(event.killerName);
      killer.kills += 1;
      if (event.isHeadshot) killer.headshots += 1;
      line(event.victimName).deaths += 1;
    }
    return {
      ...round,
      lines: [...table.values()].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths || a.name.localeCompare(b.name)),
      headshots: inRound.filter((event) => event.isHeadshot).length,
      totalKills: inRound.length,
    };
  });
  return { match, rounds };
}
