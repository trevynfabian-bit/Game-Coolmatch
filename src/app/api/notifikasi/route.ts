import type { NextRequest } from "next/server";
import { ApiError, handleRead } from "@/server/api/http";
import { countUnseen, listNotifications } from "@/server/services/notification-service";
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
 * GET /api/notifikasi?status=belum|semua&limit=30&before=<id> — kotak masuk
 * hadiah pemain, terbaru lebih dulu. `status=belum` hanya mengirim yang belum
 * dilihat. Balasan: { notifications, unseenCount, nextBefore, degraded }.
 */
export const GET = handleRead(
  async (request: NextRequest) => {
    const params = request.nextUrl.searchParams;
    const status = params.get("status") ?? "semua";
    if (status !== "semua" && status !== "belum") {
      throw new ApiError(400, "isian_tidak_sah", `"status" harus "semua" atau "belum".`);
    }
    const limit = Math.min(100, optionalPositiveInt(params.get("limit"), "limit") ?? 30);
    const beforeId = optionalPositiveInt(params.get("before"), "before");

    const player = await currentPlayer();
    const notifications = listNotifications(player.id, { unseenOnly: status === "belum", limit, beforeId });
    const nextBefore = notifications.length === limit ? notifications[notifications.length - 1].id : null;
    return Response.json({ notifications, unseenCount: countUnseen(player.id), nextBefore, degraded: false });
  },
  () => ({ notifications: [], unseenCount: 0, nextBefore: null }),
);
