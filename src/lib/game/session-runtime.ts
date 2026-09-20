import {
  stubMatchSessionSource,
  type FinishRoundRequest,
  type KillReport,
  type MatchSession,
  type MatchSessionSource,
  type RoundOutcome,
  type StartSessionRequest,
} from "@/lib/game/match-session";
import type { MatchSnapshot } from "@/types/game";

/**
 * Sesi pertandingan yang SEDANG dipakai arena, disimpan di luar React.
 *
 * Pelapor kejadian — sistem senjata saat pemain menumbangkan lawan, penggerak
 * musuh saat lawan menumbangkan pemain, jam ronde saat ronde habis — hidup di
 * dalam loop frame dan tidak punya jalan wajar untuk menerima sesi lewat prop.
 * Mereka membaca dari sini. Sumbernya satu untuk seluruh arena, jadi mengganti
 * sumber tiruan dengan pemanggil API cukup dilakukan di satu tempat.
 */
let source: MatchSessionSource = stubMatchSessionSource;
let active: MatchSession | null = null;

export function useSessionSource(next: MatchSessionSource): void {
  source = next;
}

export function activeSession(): MatchSession | null {
  return active;
}

/** Membuka sesi baru lewat sumber yang berlaku dan menjadikannya sesi aktif. */
export async function openSession(
  request: StartSessionRequest,
): Promise<MatchSession> {
  const session = await source.start(request);
  active = session;
  return session;
}

/**
 * Membuka sesi baru untuk mengulang sebuah pertandingan ("Main lagi"):
 * pesertanya dan aturannya dibaca dari potret pertandingan yang diulang.
 */
export function reopenSessionFor(
  snapshot: MatchSnapshot,
): Promise<MatchSession> {
  return openSession({
    mapId: snapshot.map.id,
    difficulty: snapshot.difficulty,
    botCount: snapshot.botCount,
    totalRounds: snapshot.round.total,
    scoreLimit: snapshot.round.scoreLimit,
    roundSeconds: snapshot.round.durationSeconds,
    participants: snapshot.fighters.map((fighter) => ({
      name: fighter.name,
      isBot: fighter.isBot,
      color: fighter.color,
    })),
    isTrial: false,
  });
}

export function clearSession(): void {
  active = null;
}

/**
 * Melaporkan satu tembakan mematikan ke sesi. Tidak ditunggu: arena tidak
 * boleh tersendat menunggu catatan; kegagalan hanya dicatat ke konsol, sebab
 * catatan bertahap ini bukan sumber kebenaran — total akhir yang menutup
 * pertandingan yang menimpanya.
 */
export function reportKill(kill: KillReport): void {
  if (!active) return;
  const matchId = active.matchId;
  source.recordKill(matchId, kill).catch((error: unknown) => {
    console.warn("Kill tidak tercatat di sesi:", error);
  });
}

/**
 * Menutup satu ronde di sesi dan mengembalikan kesimpulannya. Null bila tidak
 * ada sesi aktif atau sesi menolak — arena lalu menyimpulkan sendiri dengan
 * aturan yang sama, supaya pertandingan tidak pernah tersangkut di ujung
 * ronde hanya karena catatannya gagal.
 */
export async function closeRound(
  request: FinishRoundRequest,
): Promise<RoundOutcome | null> {
  if (!active) return null;
  try {
    return await source.finishRound(active.matchId, request);
  } catch (error) {
    console.warn("Ronde tidak tercatat di sesi:", error);
    return null;
  }
}
