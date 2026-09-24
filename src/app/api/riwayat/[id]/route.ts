import { handle, routeId } from "@/server/api/http";
import { getMatchRoundDetail } from "@/server/services/history-service";
import { currentPlayer } from "@/server/services/player-session";

/**
 * GET /api/riwayat/[id] — rincian satu pertandingan yang sudah selesai per
 * ronde: { match: HistoryMatch, rounds: [{ roundNumber, winnerName,
 * endedReason, playerKills, lines: [{ name, kills, headshots, deaths }],
 * headshots, totalKills }] }. `lines` berasal dari kejadian kill yang
 * tersinkron; kosong untuk pertandingan lama tanpa kejadian.
 * 404 bila bukan milik pemain, 409 bila belum selesai.
 */
export const GET = handle(async (_request: Request, ctx: RouteContext<"/api/riwayat/[id]">) => {
  const { id } = await ctx.params;
  const player = await currentPlayer();
  return Response.json(getMatchRoundDetail(player.id, routeId(id, "Id pertandingan")));
});
