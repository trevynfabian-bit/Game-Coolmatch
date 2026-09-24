import {
  ApiError,
  enumField,
  handle,
  intField,
  readJsonObject,
  routeId,
  stringField,
} from "@/server/api/http";
import {
  finishMatch,
  type ParticipantFacts,
  type RoundFacts,
} from "@/server/services/match-service";
import { currentPlayer } from "@/server/services/player-session";

function parseParticipants(value: unknown): ParticipantFacts[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > 17) {
    throw new ApiError(400, "isian_tidak_sah", '"participants" harus daftar 1..17 peserta.');
  }
  return value.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new ApiError(400, "isian_tidak_sah", `Peserta #${index + 1} tidak sah.`);
    }
    const p = item as Record<string, unknown>;
    return {
      name: stringField(p.name, `participants[${index}].name`, { maxLength: 40 }),
      isBot: p.isBot !== false,
      kills: intField(p.kills, "kills", { max: 10_000 }),
      deaths: intField(p.deaths, "deaths", { max: 10_000 }),
      score: intField(p.score, "score", { max: 1_000_000 }),
      roundWins: intField(p.roundWins, "roundWins", { max: 100 }),
    };
  });
}

const ROUND_CLOSE_REASONS = ["batas_kill", "waktu_habis"] as const;

function parseRounds(value: unknown): RoundFacts[] {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 15) {
    throw new ApiError(400, "isian_tidak_sah", '"rounds" harus daftar maksimal 15 ronde.');
  }
  return value.map((item, index) => {
    const r = (item ?? {}) as Record<string, unknown>;
    if (!Array.isArray(r.standings) || r.standings.length === 0 || r.standings.length > 17) {
      throw new ApiError(400, "isian_tidak_sah", `rounds[${index}].standings harus daftar 1..17 peserta.`);
    }
    return {
      roundNumber: intField(r.roundNumber, `rounds[${index}].roundNumber`, { min: 1, max: 15 }),
      endedReason: enumField(r.endedReason, `rounds[${index}].endedReason`, ROUND_CLOSE_REASONS),
      standings: r.standings.map((raw, at) => {
        const s = (raw ?? {}) as Record<string, unknown>;
        return {
          name: stringField(s.name, `rounds[${index}].standings[${at}].name`, { maxLength: 40 }),
          roundKills: intField(s.roundKills, "roundKills", { max: 1000 }),
          deaths: intField(s.deaths, "deaths", { max: 10_000 }),
        };
      }),
    };
  });
}

/**
 * POST /api/pertandingan/[id]/selesai — menutup pertandingan dan mengkredit koin.
 *
 * Badan: { participants: [{ name, isBot, kills, deaths, score, roundWins }],
 * rounds?: [{ roundNumber, endedReason, standings: [{ name, roundKills, deaths }] }],
 * bestStreak?, abandoned? }. Bila `rounds` dikirim, server memutus ulang
 * pemenang tiap ronde dan menurunkan ronde menang dari putusan itu (400
 * ronde_tidak_sah bila catatannya tidak masuk akal). Server menentukan juara dan
 * hasil, menyimpan perolehan, lalu membayar koin sesuai aturan di
 * `lib/economy/coin-rules`. Balasan: { matchId, result, winnerName, coins }.
 * Aman dikirim ulang — koin tidak dibayar dua kali.
 */
export const POST = handle(
  async (request: Request, ctx: RouteContext<"/api/pertandingan/[id]/selesai">) => {
    const { id } = await ctx.params;
    const matchId = routeId(id, "Id pertandingan");
    const body = await readJsonObject(request);
    const player = await currentPlayer();

    const outcome = finishMatch(player.id, matchId, {
      participants: parseParticipants(body.participants),
      rounds: parseRounds(body.rounds),
      bestStreak: intField(body.bestStreak, "bestStreak", { max: 10_000, fallback: 0 }),
      abandoned: body.abandoned === true,
    });

    return Response.json(outcome);
  },
);
