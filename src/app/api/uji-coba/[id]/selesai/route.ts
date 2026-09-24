import { handle, intField, readJsonObject, routeId } from "@/server/api/http";
import { parseParticipants, parseRounds } from "@/server/api/match-parsers";
import { finishTrial } from "@/server/services/trial-service";
import { currentPlayer } from "@/server/services/player-session";

/**
 * POST /api/uji-coba/[id]/selesai — mengakhiri sesi uji coba ([id] = id
 * pertandingan uji coba). Tidak mengubah statistik, progres, maupun koin.
 * Badan: { participants, rounds?, abandoned?, stats: { shots, hits, headshots, damage } }.
 * Balasan: { matchId, result, winnerName, coins (selalu excluded), session }.
 * Aman dikirim ulang.
 */
export const POST = handle(async (request: Request, ctx: RouteContext<"/api/uji-coba/[id]/selesai">) => {
  const { id } = await ctx.params;
  const matchId = routeId(id, "Id uji coba");
  const body = await readJsonObject(request);
  const raw = (body.stats ?? {}) as Record<string, unknown>;
  const player = await currentPlayer();
  const outcome = finishTrial(player.id, matchId, {
    participants: parseParticipants(body.participants),
    rounds: parseRounds(body.rounds),
    bestStreak: 0,
    abandoned: body.abandoned === true,
    stats: {
      shots: intField(raw.shots, "stats.shots", { max: 100_000, fallback: 0 }),
      hits: intField(raw.hits, "stats.hits", { max: 100_000, fallback: 0 }),
      headshots: intField(raw.headshots, "stats.headshots", { max: 100_000, fallback: 0 }),
      damage: intField(typeof raw.damage === "number" ? Math.round(raw.damage) : raw.damage, "stats.damage", { max: 10_000_000, fallback: 0 }),
    },
  });
  return Response.json(outcome);
});
