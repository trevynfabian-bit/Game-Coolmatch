import { handle, readJsonObject, stringField } from "@/server/api/http";
import { currentPlayer } from "@/server/services/player-session";
import { buySkin } from "@/server/services/skin-service";

/**
 * POST /api/skin/beli — membeli skin dengan koin.
 *
 * Badan: { skinId, equipOn?: weaponId }. Harga dari katalog server. Bila
 * `equipOn` diisi, skin langsung dipasang di senjata itu.
 * Balasan 200: { collection, wallet, transaction }. Koin kurang → 409
 * `saldo_kurang`; sudah dimiliki → 409 `sudah_dimiliki`; tidak dikenal → 404.
 */
export const POST = handle(async (request: Request) => {
  const body = await readJsonObject(request);
  const skinId = stringField(body.skinId, "skinId");
  const equipOn = body.equipOn == null ? undefined : stringField(body.equipOn, "equipOn");
  const player = await currentPlayer();
  return Response.json(buySkin(player.id, skinId, equipOn));
});
