import { and, eq } from "drizzle-orm";
import { db } from "@/server/db/client";
import { trialSessions, type TrialSessionRow } from "@/server/db/schema";
import { ApiError } from "@/server/api/http";
import { MATCH_RULES } from "@/lib/game/match-rules";
import { computeOwnership } from "@/lib/game/weapon-unlock";
import { startMatch, type Difficulty } from "@/server/services/match-service";
import { findCatalogWeapon, getWeaponProgress } from "@/server/services/weapon-service";

/**
 * Mode uji coba senjata: simulasi kilat satu ronde untuk merasakan senjata
 * apa pun, termasuk yang masih terkunci. Setiap sesi adalah pertandingan
 * `is_trial` (tanpa koin, tanpa statistik) ditambah baris `trial_sessions`
 * untuk catatan khusus senjatanya.
 */

export interface StartTrialInput {
  weaponId: string;
  difficulty: Difficulty;
  botCount: number;
  mapId: string;
}

export interface TrialSessionView {
  id: number;
  matchId: number;
  weaponId: string;
  weaponWasLocked: boolean;
  difficulty: TrialSessionRow["difficulty"];
  botCount: number;
  shots: number;
  hits: number;
  headshots: number;
  damage: number;
  kills: number;
  deaths: number;
  startedAt: number;
  endedAt: number | null;
}

export function toTrialView(row: TrialSessionRow): TrialSessionView {
  return {
    id: row.id,
    matchId: row.matchId,
    weaponId: row.weaponId,
    weaponWasLocked: row.weaponWasLocked,
    difficulty: row.difficulty,
    botCount: row.botCount,
    shots: row.shots,
    hits: row.hits,
    headshots: row.headshots,
    damage: row.damage,
    kills: row.kills,
    deaths: row.deaths,
    startedAt: row.startedAt,
    endedAt: row.endedAt,
  };
}

/**
 * Memulai uji coba: pertandingan uji coba dengan aturan kilat plus sesi
 * uji cobanya, dalam satu transaksi. Senjata terkunci boleh dicoba; statusnya
 * dicatat supaya ringkasan bisa menunjukkan syarat membukanya.
 */
export function startTrial(playerId: number, input: StartTrialInput) {
  const weapon = findCatalogWeapon(input.weaponId);
  if (!weapon) throw new ApiError(404, "senjata_tidak_ada", "Senjata tidak dikenal.");
  const locked = !computeOwnership(weapon.id, getWeaponProgress(playerId)).isUnlocked;

  return db.transaction(() => {
    const match = startMatch(playerId, {
      mapId: input.mapId,
      difficulty: input.difficulty,
      botCount: input.botCount,
      ...MATCH_RULES.uji_coba,
      isTrial: true,
      weaponId: weapon.id,
    });
    const session = db
      .insert(trialSessions)
      .values({
        playerId,
        matchId: match.id,
        weaponId: weapon.id,
        weaponWasLocked: locked,
        difficulty: input.difficulty,
        botCount: input.botCount,
        startedAt: match.startedAt,
      })
      .returning()
      .get();
    return { match, session: toTrialView(session) };
  });
}

/** Sesi uji coba milik pemain untuk sebuah pertandingan uji coba. */
export function findTrialByMatch(playerId: number, matchId: number): TrialSessionRow | undefined {
  return db
    .select()
    .from(trialSessions)
    .where(and(eq(trialSessions.playerId, playerId), eq(trialSessions.matchId, matchId)))
    .get();
}
