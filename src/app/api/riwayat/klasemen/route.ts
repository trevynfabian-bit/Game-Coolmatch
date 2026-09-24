import type { NextRequest } from "next/server";
import { ApiError, handleRead } from "@/server/api/http";
import { getAggregateStandings } from "@/server/services/history-service";
import { currentPlayer } from "@/server/services/player-session";

/**
 * GET /api/riwayat/klasemen?limit=50 — klasemen gabungan semua peserta (pemain
 * dan bot, menurut nama) dari pertandingan sah pemain ini. Uji coba dan
 * pertandingan yang ditinggal tidak dihitung. Urutan: kemenangan, total kill,
 * rasio K/M; peserta yang sama persis berbagi peringkat.
 * Balasan: { standings: [{ rank, name, isBot, matches, wins, kills, deaths,
 * score, roundWins, kd }], matchesCounted, summary, degraded }.
 */
export const GET = handleRead(
  async (request: NextRequest) => {
    const raw = request.nextUrl.searchParams.get("limit");
    const limit = raw == null ? 50 : Number(raw);
    if (!Number.isInteger(limit) || limit <= 0) {
      throw new ApiError(400, "isian_tidak_sah", '"limit" harus bilangan bulat positif.');
    }
    const player = await currentPlayer();
    return Response.json({ ...getAggregateStandings(player.id, { limit }), degraded: false });
  },
  () => ({ standings: [], matchesCounted: 0, summary: null }),
);
