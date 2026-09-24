import type { NextRequest } from "next/server";
import { ApiError, enumField, handleRead } from "@/server/api/http";
import { listMatchHistory } from "@/server/services/history-service";
import { currentPlayer } from "@/server/services/player-session";

function optionalPositiveInt(raw: string | null, name: string): number | undefined {
  if (raw == null || raw === "") return undefined;
  const value = Number(raw);
  if (!Number.isInteger(value) || value <= 0) {
    throw new ApiError(400, "isian_tidak_sah", `"${name}" harus bilangan bulat positif.`);
  }
  return value;
}

/**
 * GET /api/riwayat?mode=semua|pertandingan|uji&limit=50&before=<id> — riwayat
 * pertandingan yang sudah selesai, terbaru lebih dulu, lengkap dengan peserta,
 * ronde, dan koin yang didapat. Uji coba ditandai `isTrial`.
 * Balasan: { matches: HistoryMatch[], nextBefore: id | null, degraded }.
 */
export const GET = handleRead(
  async (request: NextRequest) => {
    const params = request.nextUrl.searchParams;
    const mode = enumField(params.get("mode") ?? undefined, "mode", ["semua", "pertandingan", "uji"] as const, "semua");
    const limit = optionalPositiveInt(params.get("limit"), "limit") ?? 50;
    const beforeId = optionalPositiveInt(params.get("before"), "before");
    const player = await currentPlayer();
    return Response.json({ ...listMatchHistory(player.id, { limit, beforeId, mode }), degraded: false });
  },
  () => ({ matches: [], nextBefore: null }),
);
