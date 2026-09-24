import { and, asc, count, eq, max } from "drizzle-orm";
import { db } from "@/server/db/client";
import { matchKillEvents, matches, type MatchRow } from "@/server/db/schema";
import { ApiError } from "@/server/api/http";

/**
 * Sinkronisasi kejadian kill selama pertandingan dan skor langsung yang
 * dihitung darinya. Arena tetap berjalan di klien; server menampung kejadian
 * secara bertahap supaya papan skor bisa dibaca dari server kapan saja.
 */

export interface KillEventInput {
  seq: number;
  roundNumber: number;
  killerName: string;
  victimName: string;
  weaponName: string;
  isHeadshot: boolean;
  atSecond: number;
}

export interface LiveScoreEntry {
  name: string;
  kills: number;
  deaths: number;
  headshots: number;
}

export interface LiveScore {
  matchId: number;
  /** Ronde tertinggi yang punya kejadian; 0 bila belum ada. */
  roundNumber: number;
  /** Nomor urut terakhir yang diterima server; klien melanjutkan dari sini. */
  lastSeq: number;
  totalKills: number;
  standings: LiveScoreEntry[];
  ended: boolean;
}

function ownedMatch(playerId: number, matchId: number): MatchRow {
  const match = db
    .select()
    .from(matches)
    .where(and(eq(matches.id, matchId), eq(matches.playerId, playerId)))
    .get();
  if (!match) throw new ApiError(404, "pertandingan_tidak_ada", "Pertandingan tidak ditemukan.");
  return match;
}

/** Batas kejadian yang masuk akal untuk satu pertandingan. */
function eventCap(match: MatchRow): number {
  return match.totalRounds * match.scoreLimit * (match.botCount + 1);
}

/**
 * Menyimpan sekumpulan kejadian kill. Idempoten per nomor urut: batch yang
 * dikirim ulang karena jaringan putus tidak menggandakan kill. Pertandingan
 * yang sudah ditutup tidak menerima kejadian baru.
 */
export function recordKillEvents(playerId: number, matchId: number, events: KillEventInput[]): LiveScore {
  const match = ownedMatch(playerId, matchId);
  if (match.endedAt != null) {
    throw new ApiError(409, "pertandingan_sudah_selesai", "Pertandingan sudah ditutup; kejadian baru ditolak.");
  }
  for (const event of events) {
    if (event.roundNumber > match.totalRounds) {
      throw new ApiError(400, "isian_tidak_sah", `Ronde ${event.roundNumber} melebihi jumlah ronde pertandingan.`);
    }
    if (event.killerName === event.victimName) {
      throw new ApiError(400, "isian_tidak_sah", "Pembunuh dan korban tidak boleh sama.");
    }
    if (event.seq > eventCap(match)) {
      throw new ApiError(400, "isian_tidak_sah", "Nomor urut kejadian melebihi batas pertandingan ini.");
    }
  }

  db.transaction((tx) => {
    for (const event of events) {
      tx.insert(matchKillEvents)
        .values({ matchId, ...event })
        .onConflictDoNothing({ target: [matchKillEvents.matchId, matchKillEvents.seq] })
        .run();
    }
  });
  return buildLiveScore(match);
}

/** Skor langsung sebuah pertandingan milik pemain, dihitung dari kejadian yang tersimpan. */
export function getLiveScore(playerId: number, matchId: number): LiveScore {
  return buildLiveScore(ownedMatch(playerId, matchId));
}

function buildLiveScore(match: MatchRow): LiveScore {
  const rows = db
    .select()
    .from(matchKillEvents)
    .where(eq(matchKillEvents.matchId, match.id))
    .orderBy(asc(matchKillEvents.seq))
    .all();

  const table = new Map<string, LiveScoreEntry>();
  const entry = (name: string) => {
    let found = table.get(name);
    if (!found) {
      found = { name, kills: 0, deaths: 0, headshots: 0 };
      table.set(name, found);
    }
    return found;
  };
  for (const row of rows) {
    const killer = entry(row.killerName);
    killer.kills += 1;
    if (row.isHeadshot) killer.headshots += 1;
    entry(row.victimName).deaths += 1;
  }

  const summary = db
    .select({ lastSeq: max(matchKillEvents.seq), round: max(matchKillEvents.roundNumber), total: count() })
    .from(matchKillEvents)
    .where(eq(matchKillEvents.matchId, match.id))
    .get();

  return {
    matchId: match.id,
    roundNumber: summary?.round ?? 0,
    lastSeq: summary?.lastSeq ?? 0,
    totalKills: summary?.total ?? 0,
    standings: [...table.values()].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths || a.name.localeCompare(b.name)),
    ended: match.endedAt != null,
  };
}
