import type {
  FinishRoundRequest,
  HitReport,
  KillReport,
  MatchSession,
  MatchSessionSource,
  RoundOutcome,
  StartSessionRequest,
} from "@/lib/game/match-session";
import type { RoundRules } from "@/lib/game/round-rules";
import type { MatchResult, MatchScoreLine } from "@/types/game";

/**
 * Sumber sesi SUNGGUHAN: memanggil API pertandingan di server.
 *
 * - `start`: POST /api/pertandingan membuka baris pertandingan beserta
 *   pesertanya, lalu GET /api/pertandingan/:id membaca sesi yang baru dibuka
 *   — daftar pesaing, aturan, dan perolehan — dalam bentuk yang dipakai arena.
 * - `recordHit` dan `recordKill`: POST …/hit dan …/kill, dijalankan berurutan
 *   lewat satu antrean supaya rentetan SMG tidak menjadi lima belas permintaan
 *   yang berebut kunci tulis database pada saat yang sama.
 * - `finishRound`: POST …/ronde; kesimpulannya — pemenang ronde, roster,
 *   juara, hasil — dihitung server dengan aturan yang sama dengan arena.
 *
 * Jawaban yang bukan 2xx dilempar sebagai galat; pemanggilnya (runtime sesi)
 * yang memutuskan: mencatat peringatan untuk kejadian, atau menyimpulkan
 * sendiri untuk ronde. `fetchImpl` bisa disuntik supaya sumber ini bisa
 * diperiksa tanpa server.
 */
interface LiveScoreboardPayload {
  matchId: number;
  mapId: string;
  difficulty: MatchSession["difficulty"];
  botCount: number;
  totalRounds: number;
  scoreLimit: number;
  roundSeconds: number;
  isTrial: boolean;
  status: "berjalan" | "selesai";
  rules?: RoundRules;
  scoreboard: MatchScoreLine[];
}

interface RoundOutcomePayload {
  roundWinner: string | null;
  matchEnded: boolean;
  matchWinner: string | null;
  result: MatchResult | null;
  scoreboard: MatchScoreLine[];
}

type FetchLike = (input: string, init?: RequestInit) => Promise<Response>;

async function call<T>(
  fetchImpl: FetchLike,
  method: "GET" | "POST",
  path: string,
  body?: unknown,
): Promise<T> {
  const response = await fetchImpl(path, {
    method,
    headers:
      body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store",
  });
  if (!response.ok) {
    const pesan = await response
      .json()
      .then((data: { error?: { message?: string } }) => data?.error?.message)
      .catch(() => undefined);
    throw new Error(pesan ?? `${method} ${path} gagal (${response.status}).`);
  }
  return (await response.json()) as T;
}

function toSession(payload: LiveScoreboardPayload): MatchSession {
  return {
    matchId: String(payload.matchId),
    mapId: payload.mapId,
    difficulty: payload.difficulty,
    botCount: payload.botCount,
    totalRounds: payload.totalRounds,
    scoreLimit: payload.scoreLimit,
    roundSeconds: payload.roundSeconds,
    isTrial: payload.isTrial,
    status: payload.status,
    rules: payload.rules,
    competitors: payload.scoreboard,
  };
}

export function createRemoteMatchSessionSource(
  fetchImpl: FetchLike = (input, init) => fetch(input, init),
): MatchSessionSource {
  // Kejadian dikirim berurutan; kegagalan satu kejadian tidak menahan
  // kejadian berikutnya, hanya dilaporkan ke pemanggilnya sendiri.
  let antrean: Promise<unknown> = Promise.resolve();
  const antre = <T>(kerja: () => Promise<T>): Promise<T> => {
    const hasil = antrean.then(kerja, kerja);
    antrean = hasil.catch(() => undefined);
    return hasil;
  };

  return {
    async start(request: StartSessionRequest) {
      const dibuka = await call<{ matchId: number }>(
        fetchImpl,
        "POST",
        "/api/pertandingan",
        request,
      );
      const sesi = await call<LiveScoreboardPayload>(
        fetchImpl,
        "GET",
        `/api/pertandingan/${dibuka.matchId}`,
      );
      return toSession(sesi);
    },

    recordHit(matchId: string, hit: HitReport) {
      return antre(async () => {
        await call(fetchImpl, "POST", `/api/pertandingan/${matchId}/hit`, hit);
      });
    },

    recordKill(matchId: string, kill: KillReport) {
      return antre(async () => {
        await call(
          fetchImpl,
          "POST",
          `/api/pertandingan/${matchId}/kill`,
          kill,
        );
      });
    },

    finishRound(matchId: string, request: FinishRoundRequest) {
      // Ikut antrean supaya kill terakhir ronde sudah tercatat sebelum
      // rondenya disimpulkan.
      return antre(async (): Promise<RoundOutcome> => {
        const hasil = await call<RoundOutcomePayload>(
          fetchImpl,
          "POST",
          `/api/pertandingan/${matchId}/ronde`,
          request,
        );
        return {
          roundWinner: hasil.roundWinner,
          matchEnded: hasil.matchEnded,
          matchWinner: hasil.matchWinner,
          result: hasil.result,
          scoreboard: hasil.scoreboard,
        };
      });
    },
  };
}

/** Sesi yang sedang berjalan di server, atau null bila tidak ada. */
export async function fetchOpenSession(
  fetchImpl: FetchLike = (input, init) => fetch(input, init),
): Promise<MatchSession | null> {
  try {
    const response = await fetchImpl("/api/pertandingan/berjalan", {
      cache: "no-store",
    });
    if (response.status === 404) return null;
    if (!response.ok) return null;
    return toSession((await response.json()) as LiveScoreboardPayload);
  } catch {
    return null;
  }
}
