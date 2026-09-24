import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/server/db/client";
import { trialSessions, type TrialSessionRow } from "@/server/db/schema";
import { ApiError } from "@/server/api/http";
import { MATCH_RULES } from "@/lib/game/match-rules";
import { computeOwnership } from "@/lib/game/weapon-unlock";
import { finishMatch, startMatch, type Difficulty, type FinishMatchInput } from "@/server/services/match-service";
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

export interface TrialStatsInput {
  shots: number;
  hits: number;
  headshots: number;
  damage: number;
}

/**
 * Mengakhiri uji coba: pertandingan uji cobanya ditutup lewat jalur yang sama
 * dengan pertandingan biasa (koin otomatis dikecualikan untuk is_trial, dan
 * statistik pemain memang tidak menghitung is_trial), lalu catatan senjatanya
 * disimpan di sesi. Idempoten: sesi yang sudah berakhir dikembalikan apa adanya.
 */
export function finishTrial(
  playerId: number,
  matchId: number,
  input: FinishMatchInput & { stats: TrialStatsInput },
) {
  const session = findTrialByMatch(playerId, matchId);
  if (!session) throw new ApiError(404, "uji_coba_tidak_ada", "Sesi uji coba tidak ditemukan.");

  const { stats } = input;
  if (stats.hits > stats.shots || stats.headshots > stats.hits) {
    throw new ApiError(400, "isian_tidak_sah", "Kena tidak boleh melebihi butir, dan kena kepala tidak boleh melebihi kena.");
  }

  const outcome = finishMatch(playerId, matchId, input);
  if (session.endedAt == null) {
    const local = input.participants.find((participant) => !participant.isBot);
    db.update(trialSessions)
      .set({
        shots: stats.shots,
        hits: stats.hits,
        headshots: stats.headshots,
        damage: Math.round(stats.damage),
        kills: local?.kills ?? 0,
        deaths: local?.deaths ?? 0,
        endedAt: Date.now(),
      })
      .where(and(eq(trialSessions.id, session.id), isNull(trialSessions.endedAt)))
      .run();
  }
  const saved = db.select().from(trialSessions).where(eq(trialSessions.id, session.id)).get()!;
  // Bentuknya sama dengan penutupan pertandingan biasa (koin selalu
  // `excluded`), ditambah sesi uji cobanya.
  return { ...outcome, session: toTrialView(saved) };
}
