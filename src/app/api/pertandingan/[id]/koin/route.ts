import { handle, routeId } from "@/server/api/http";
import { getMatchCoinSummary } from "@/server/services/coin-service";
import { currentPlayer } from "@/server/services/player-session";

/**
 * GET /api/pertandingan/[id]/koin — ringkasan koin sebuah pertandingan milik
 * pemain: status pembayaran, pengali kesulitan, dan rincian baris yang
 * tercatat. Hanya baca; membayar koin tetap lewat /selesai.
 * Balasan: { summary: { matchId, status, result, difficulty, multiplier, lines, total, endedAt } }.
 */
export const GET = handle(async (_request: Request, ctx: RouteContext<"/api/pertandingan/[id]/koin">) => {
  const { id } = await ctx.params;
  const matchId = routeId(id, "Id pertandingan");
  const player = await currentPlayer();
  return Response.json({ summary: getMatchCoinSummary(player.id, matchId) });
});
