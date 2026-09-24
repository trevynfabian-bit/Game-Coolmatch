import { KILLSTREAK_IDS } from "@/server/db/schema";
import { enumField, handle, readJsonObject } from "@/server/api/http";
import { buyReward } from "@/server/services/killstreak-service";
import { currentPlayer } from "@/server/services/player-session";

/**
 * POST /api/killstreak/buka — membuka hadiah killstreak dengan koin.
 *
 * Badan: { rewardId }. Sudah terbuka (termasuk lewat pencapaian) → 409
 * `sudah_terbuka`; koin kurang → 409 `saldo_kurang`.
 * Balasan 200: { rewards, wallet, transaction }.
 */
export const POST = handle(async (request: Request) => {
  const body = await readJsonObject(request);
  const rewardId = enumField(body.rewardId, "rewardId", KILLSTREAK_IDS);
  const player = await currentPlayer();
  return Response.json(buyReward(player.id, rewardId));
});
