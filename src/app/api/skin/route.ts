import { handleRead } from "@/server/api/http";
import { currentPlayer } from "@/server/services/player-session";
import { getSkinCollection } from "@/server/services/skin-service";

/**
 * GET /api/skin — koleksi skin pemain: yang dimiliki dan yang terpasang per
 * senjata. Balasan: { collection: { ownedSkinIds, equipped }, degraded }.
 */
export const GET = handleRead(
  async () => {
    const player = await currentPlayer();
    return Response.json({ collection: getSkinCollection(player.id), degraded: false });
  },
  () => ({ collection: { ownedSkinIds: [], equipped: {} } }),
);
