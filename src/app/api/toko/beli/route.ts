import { UPGRADE_STATS } from "@/server/db/schema";
import {
  ApiError,
  enumField,
  handle,
  readJsonObject,
  stringField,
} from "@/server/api/http";
import { currentPlayer } from "@/server/services/player-session";
import { buyAttachment, buyUpgrade } from "@/server/services/shop-service";

/**
 * POST /api/toko/beli — membeli upgrade atau attachment dengan koin.
 *
 * Badan salah satu dari:
 * - { type: "upgrade", weaponId, stat }            → tingkat berikutnya statistik itu
 * - { type: "attachment", weaponId, attachmentId } → dibeli lalu langsung dipasang
 *
 * Harga selalu dari katalog server. Balasan 200: { weapon, wallet, transaction }.
 * Koin kurang → 409 `saldo_kurang`; sudah maksimal/dimiliki → 409; tidak
 * cocok → 400; tidak dikenal → 404.
 */
export const POST = handle(async (request: Request) => {
  const body = await readJsonObject(request);
  const type = enumField(body.type, "type", ["upgrade", "attachment"] as const);
  const weaponId = stringField(body.weaponId, "weaponId");
  const player = await currentPlayer();

  if (type === "upgrade") {
    const stat = enumField(body.stat, "stat", UPGRADE_STATS);
    return Response.json(buyUpgrade(player.id, weaponId, stat));
  }
  if (type === "attachment") {
    const attachmentId = stringField(body.attachmentId, "attachmentId");
    return Response.json(buyAttachment(player.id, weaponId, attachmentId));
  }
  throw new ApiError(400, "isian_tidak_sah", "Jenis pembelian tidak dikenal.");
});
