import { FAVORITE_KINDS } from "@/server/db/schema";
import { enumField, handle, readJsonObject, stringField } from "@/server/api/http";
import { toggleFavorite } from "@/server/services/favorite-service";
import { currentPlayer } from "@/server/services/player-session";

/**
 * POST /api/favorit/toggle — menandai atau melepas favorit.
 *
 * Badan: { kind: "senjata" | "skin", itemId }. Skin yang belum dimiliki → 409.
 * Balasan 200: { favorites, isFavorite }.
 */
export const POST = handle(async (request: Request) => {
  const body = await readJsonObject(request);
  const kind = enumField(body.kind, "kind", FAVORITE_KINDS);
  const itemId = stringField(body.itemId, "itemId");
  const player = await currentPlayer();
  return Response.json(toggleFavorite(player.id, kind, itemId));
});
