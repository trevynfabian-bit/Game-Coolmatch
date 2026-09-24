import { and, count, eq, inArray, sql, type SQL } from "drizzle-orm";
import { db } from "@/server/db/client";
import {
  coinTransactions,
  matchKillstreakEvents,
  matches,
  playerWeapons,
  practiceSessions,
  rewardNotifications,
  trialSessions,
  weapons,
  type MatchRow,
} from "@/server/db/schema";
import { ApiError } from "@/server/api/http";
import { getAchievementStats } from "@/server/services/player-stats-service";

/**
 * Satu-satunya tempat aturan isolasi progres: pertandingan uji coba
 * (`is_trial`) dan latihan sasaran TIDAK PERNAH memengaruhi statistik,
 * syarat buka senjata/hadiah, koin, maupun killstreak. Layanan lain memakai
 * fungsi di sini alih-alih memeriksa `isTrial` sendiri-sendiri, supaya aturan
 * ini tidak bisa terlewat di satu tempat.
 */

/** Benar bila pertandingan ini boleh dihitung ke progres pemain. */
export function countsTowardProgress(match: Pick<MatchRow, "isTrial" | "endedAt">): boolean {
  return !match.isTrial && match.endedAt != null;
}

/** Benar bila pertandingan ini berhak menerima koin/hadiah (bukan uji coba). */
export function earnsRewards(match: Pick<MatchRow, "isTrial">): boolean {
  return !match.isTrial;
}

/** Kondisi SQL pertandingan yang dihitung ke progres seorang pemain. */
export function progressMatchesOf(playerId: number): SQL {
  return and(eq(matches.playerId, playerId), eq(matches.isTrial, false), sql`${matches.endedAt} IS NOT NULL`)!;
}

/** Menolak aksi progres (mis. kejadian killstreak) pada pertandingan uji coba. */
export function assertEarnsRewards(match: Pick<MatchRow, "isTrial">, action: string): void {
  if (!earnsRewards(match)) {
    throw new ApiError(409, "uji_coba_terisolasi", `Uji coba tidak memengaruhi progres: ${action} ditolak.`);
  }
}

export interface IsolationReport {
  trialMatches: number;
  practiceSessions: number;
  trialSessions: number;
  /** Harus selalu nol: bukti uji coba tidak pernah menyentuh koin/killstreak/notifikasi/senjata. */
  leaks: {
    coinTransactions: number;
    killstreakEvents: number;
    coinNotifications: number;
    /** Senjata tercatat terbuka lewat pencapaian padahal statistik sungguhan belum memenuhi. */
    weaponUnlocksWithoutProgress: number;
  };
}

/**
 * Audit isolasi untuk seorang pemain: berapa sesi latihan/uji coba yang ada,
 * dan apakah ada jejak progres yang bocor dari sesi-sesi itu.
 */
export function isolationReport(playerId: number): IsolationReport {
  const trialIds = db
    .select({ id: matches.id })
    .from(matches)
    .where(and(eq(matches.playerId, playerId), eq(matches.isTrial, true)))
    .all()
    .map((row) => row.id);
  const countOf = (query: { get: () => { value: number } | undefined }) => query.get()?.value ?? 0;
  const ids = trialIds.length > 0 ? trialIds : [-1];
  return {
    trialMatches: trialIds.length,
    practiceSessions: countOf(db.select({ value: count() }).from(practiceSessions).where(eq(practiceSessions.playerId, playerId))),
    trialSessions: countOf(db.select({ value: count() }).from(trialSessions).where(eq(trialSessions.playerId, playerId))),
    leaks: {
      coinTransactions: countOf(
        db
          .select({ value: count() })
          .from(coinTransactions)
          .where(
            and(
              eq(coinTransactions.playerId, playerId),
              eq(coinTransactions.sourceType, "match"),
              inArray(coinTransactions.sourceId, ids.map(String)),
            ),
          ),
      ),
      killstreakEvents: countOf(
        db.select({ value: count() }).from(matchKillstreakEvents).where(inArray(matchKillstreakEvents.matchId, ids)),
      ),
      coinNotifications: countOf(
        db
          .select({ value: count() })
          .from(rewardNotifications)
          .where(
            and(
              eq(rewardNotifications.playerId, playerId),
              inArray(rewardNotifications.sourceId, ids.map((id) => `pertandingan:${id}`)),
            ),
          ),
      ),
      weaponUnlocksWithoutProgress: unlocksWithoutProgress(playerId),
    },
  };
}

/** Senjata "pencapaian" yang tercatat terbuka tanpa statistik sungguhan yang memenuhi syaratnya. */
function unlocksWithoutProgress(playerId: number): number {
  const stats = getAchievementStats(playerId);
  const rows = db
    .select({ unlockStat: weapons.unlockStat, unlockTarget: weapons.unlockTarget })
    .from(playerWeapons)
    .innerJoin(weapons, eq(weapons.id, playerWeapons.weaponId))
    .where(and(eq(playerWeapons.playerId, playerId), eq(playerWeapons.via, "pencapaian")))
    .all();
  return rows.filter((row) => row.unlockStat && row.unlockTarget && stats[row.unlockStat] < row.unlockTarget).length;
}
