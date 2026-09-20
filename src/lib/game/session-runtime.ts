import { createRemoteMatchSessionSource } from "@/lib/api/match-session-remote";
import {
  isStubSession,
  stubMatchSessionSource,
  type FinishRoundRequest,
  type HitReport,
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
 * Mereka membaca dari sini.
 *
 * Sumbernya server: sesi dibuka di API pertandingan, dan kesimpulan ronde —
 * pemenang, roster, juara — dihitung di sana. Bila server tidak terjangkau
 * saat membuka sesi, arena tidak boleh mati: sesi dibuka pada sumber tiruan
 * dengan aturan yang sama, dan seluruh kejadian sesi itu pun dikirim ke
 * sumber tiruan (id-nya yang mengenalinya), jadi pertandingan luring tetap
 * utuh walau tidak tercatat.
 */
const remoteSource = createRemoteMatchSessionSource();
let source: MatchSessionSource = remoteSource;
let active: MatchSession | null = null;

/** Sumber tempat sebuah sesi dibuka: tiruan untuk id tiruan, selebihnya sumber yang berlaku. */
function sourceFor(session: Pick<MatchSession, "matchId">): MatchSessionSource {
  return isStubSession(session) ? stubMatchSessionSource : source;
}

export function useSessionSource(next: MatchSessionSource): void {
  source = next;
}

export function activeSession(): MatchSession | null {
  return active;
}

/**
 * Membuka sesi baru lewat sumber yang berlaku dan menjadikannya sesi aktif.
 * Server yang tidak terjangkau tidak menggagalkannya: sesi dibuka pada sumber
 * tiruan, dengan peringatan di konsol.
 */
export async function openSession(
  request: StartSessionRequest,
): Promise<MatchSession> {
  let session: MatchSession;
  try {
    session = await source.start(request);
  } catch (error) {
    console.warn(
      "Sesi tidak bisa dibuka di server; memakai sesi tiruan:",
      error,
    );
    session = await stubMatchSessionSource.start(request);
  }
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
      weaponId: fighter.weaponId,
    })),
    // Tanda uji coba dari sesi yang sedang aktif: potret tidak menyimpannya,
    // sedangkan mengulang uji coba tetap uji coba.
    isTrial: active?.isTrial ?? false,
  });
}

export function clearSession(): void {
  active = null;
}

/**
 * Melaporkan satu peluru yang kena ke sesi. Tidak ditunggu, seperti kill:
 * jejak hit adalah catatan bertahap, bukan sumber kebenaran, dan arena tidak
 * boleh tersendat karenanya.
 */
export function reportHit(hit: HitReport): void {
  if (!active) return;
  sourceFor(active)
    .recordHit(active.matchId, hit)
    .catch((error: unknown) => {
      console.warn("Hit tidak tercatat di sesi:", error);
    });
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
  sourceFor(active)
    .recordKill(matchId, kill)
    .catch((error: unknown) => {
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
    return await sourceFor(active).finishRound(active.matchId, request);
  } catch (error) {
    console.warn("Ronde tidak tercatat di sesi:", error);
    return null;
  }
}
