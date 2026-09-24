import { ApiError, enumField, handle, readJsonObject, stringField } from "@/server/api/http";
import { REWARD_NOTIFICATION_KINDS } from "@/server/db/schema";
import { countUnseen, markSeen, type MarkSeenTarget } from "@/server/services/notification-service";
import { currentPlayer } from "@/server/services/player-session";

const MAX_IDS = 100;

function parseTarget(body: Record<string, unknown>): MarkSeenTarget {
  if (body.all === true) return { all: true };
  if (body.ids !== undefined) {
    const ids = body.ids;
    if (
      !Array.isArray(ids) ||
      ids.length === 0 ||
      ids.length > MAX_IDS ||
      !ids.every((id) => typeof id === "number" && Number.isInteger(id) && id > 0)
    ) {
      throw new ApiError(400, "isian_tidak_sah", `"ids" harus daftar 1..${MAX_IDS} id notifikasi.`);
    }
    return { ids: [...new Set(ids as number[])] };
  }
  if (body.kind !== undefined || body.itemId !== undefined) {
    return {
      kind: enumField(body.kind, "kind", REWARD_NOTIFICATION_KINDS),
      itemId: stringField(body.itemId, "itemId", { maxLength: 64 }),
    };
  }
  throw new ApiError(400, "isian_tidak_sah", 'Kirim "all": true, "ids": [...], atau "kind" + "itemId".');
}

/**
 * POST /api/notifikasi/dilihat — menandai notifikasi sudah dilihat.
 * Badan: { all: true } | { ids: number[] } | { kind, itemId }.
 * Idempoten; notifikasi milik pemain lain diabaikan tanpa galat.
 * Balasan: { updated, unseenCount, seenAt }.
 */
export const POST = handle(async (request: Request) => {
  const target = parseTarget(await readJsonObject(request));
  const player = await currentPlayer();
  const seenAt = Date.now();
  const updated = markSeen(player.id, target, seenAt);
  return Response.json({ updated, unseenCount: countUnseen(player.id), seenAt });
});
