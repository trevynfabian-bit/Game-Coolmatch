import type { NextRequest } from "next/server";
import { ApiError, handleRead } from "@/server/api/http";
import { listTransactions } from "@/server/services/coin-service";
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
 * GET /api/koin/riwayat?limit=30&before=<id> — riwayat koin masuk dan keluar,
 * terbaru lebih dulu.
 *
 * Paginasi memakai kursor `before` (id transaksi terakhir yang sudah tampil)
 * alih-alih offset, supaya transaksi baru yang masuk tidak menggeser halaman.
 * Balasan: { transactions: [...], nextBefore: id | null, degraded: false }.
 */
export const GET = handleRead(
  async (request: NextRequest) => {
    const params = request.nextUrl.searchParams;
    const limit = Math.min(100, optionalPositiveInt(params.get("limit"), "limit") ?? 30);
    const beforeId = optionalPositiveInt(params.get("before"), "before");

    const player = await currentPlayer();
    const transactions = listTransactions(player.id, { limit, beforeId });
    const nextBefore =
      transactions.length === limit ? transactions[transactions.length - 1].id : null;

    return Response.json({ transactions, nextBefore, degraded: false });
  },
  () => ({ transactions: [], nextBefore: null }),
);
