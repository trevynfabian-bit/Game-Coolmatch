import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { coinTransactions, matchRounds, matchScores, matches, type MatchRow } from "@/server/db/schema";
import { ApiError } from "@/server/api/http";
import { findMap } from "@/lib/mock/maps";
import type { HistoryMatch, HistoryParticipant } from "@/types/history";

/**
 * Laporan akhir pertandingan: klasemen peserta, juara, dan ronde, disusun
 * dari baris yang ditulis server saat pertandingan ditutup. Dipakai layar
 * akhir dan halaman detail riwayat.
 */

export interface RankedParticipant extends HistoryParticipant {
  /** Peringkat 1..n; peserta yang benar-benar seri berbagi peringkat. */
  rank: number;
}

export interface MatchReport {
  match: HistoryMatch;
  standings: RankedParticipant[];
  champion: { name: string; isBot: boolean } | null;
}

/** Urutan sama dengan `findMatchWinner`: ronde menang, kill, lalu kematian tersedikit. */
function compare(a: HistoryParticipant, b: HistoryParticipant): number {
  return b.roundWins - a.roundWins || b.kills - a.kills || a.deaths - b.deaths;
}

export function rankParticipants(participants: HistoryParticipant[]): RankedParticipant[] {
  const sorted = [...participants].sort((a, b) => compare(a, b) || a.name.localeCompare(b.name));
  let rank = 0;
  return sorted.map((participant, index) => {
    if (index === 0 || compare(sorted[index - 1], participant) !== 0) rank = index + 1;
    return { ...participant, rank };
  });
}

/** Bentuk riwayat satu pertandingan yang sudah ditutup. */
export function toHistoryMatch(match: MatchRow): HistoryMatch {
  const participants = db
    .select()
    .from(matchScores)
    .where(eq(matchScores.matchId, match.id))
    .all()
    .map((row) => ({
      name: row.participantName,
      isBot: row.isBot,
      kills: row.kills,
      deaths: row.deaths,
      score: row.score,
      roundWins: row.roundWins,
      isWinner: row.isWinner,
    }));
  const rounds = db
    .select()
    .from(matchRounds)
    .where(eq(matchRounds.matchId, match.id))
    .orderBy(asc(matchRounds.roundNumber))
    .all()
    .map((row) => ({
      roundNumber: row.roundNumber,
      winnerName: row.winnerName,
      endedReason: row.endedReason,
      playerKills: row.playerKills,
    }));
  const coins = db
    .select({ total: sql<number>`coalesce(sum(${coinTransactions.amount}), 0)` })
    .from(coinTransactions)
    .where(
      and(
        eq(coinTransactions.playerId, match.playerId),
        eq(coinTransactions.sourceType, "match"),
        eq(coinTransactions.sourceId, String(match.id)),
      ),
    )
    .get();

  return {
    id: match.id,
    mapId: match.mapId,
    mapName: findMap(match.mapId).name,
    difficulty: match.difficulty,
    botCount: match.botCount,
    totalRounds: match.totalRounds,
    result: match.result ?? "ditinggal",
    winnerName: match.winnerName,
    bestStreak: match.bestStreak,
    coinsEarned: coins?.total ?? 0,
    isTrial: match.isTrial,
    weaponId: match.weaponId,
    startedAt: match.startedAt,
    endedAt: match.endedAt ?? match.startedAt,
    participants,
    rounds,
  };
}

/** Klasemen dan juara akhir sebuah pertandingan milik pemain yang sudah ditutup. */
export function getMatchReport(playerId: number, matchId: number): MatchReport {
  const match = db
    .select()
    .from(matches)
    .where(and(eq(matches.id, matchId), eq(matches.playerId, playerId)))
    .get();
  if (!match) throw new ApiError(404, "pertandingan_tidak_ada", "Pertandingan tidak ditemukan.");
  if (match.endedAt == null) {
    throw new ApiError(409, "pertandingan_belum_selesai", "Klasemen akhir baru ada setelah pertandingan selesai.");
  }
  const history = toHistoryMatch(match);
  const standings = rankParticipants(history.participants);
  const championRow = history.winnerName ? standings.find((row) => row.name === history.winnerName) : undefined;
  return {
    match: history,
    standings,
    champion: championRow ? { name: championRow.name, isBot: championRow.isBot } : null,
  };
}
