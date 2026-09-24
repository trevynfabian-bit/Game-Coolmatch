import { handle, routeId } from "@/server/api/http";
import { getMatchReport } from "@/server/services/match-report-service";
import { currentPlayer } from "@/server/services/player-session";

/**
 * GET /api/pertandingan/[id]/klasemen — klasemen dan juara akhir pertandingan
 * yang sudah ditutup. Peringkat mengikuti aturan juara (ronde menang, kill,
 * kematian tersedikit); peserta yang benar-benar seri berbagi peringkat.
 * Balasan: { match, standings: [{ rank, name, ... }], champion: { name, isBot } | null }.
 * 409 bila pertandingan belum selesai.
 */
export const GET = handle(async (_request: Request, ctx: RouteContext<"/api/pertandingan/[id]/klasemen">) => {
  const { id } = await ctx.params;
  const player = await currentPlayer();
  return Response.json(getMatchReport(player.id, routeId(id, "Id pertandingan")));
});
