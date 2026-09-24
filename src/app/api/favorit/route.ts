import { handleRead } from "@/server/api/http";
import { listFavorites } from "@/server/services/favorite-service";
import { currentPlayer } from "@/server/services/player-session";

/**
 * GET /api/favorit — favorit galeri pemain sebagai kunci "senjata:<id>" atau
 * "skin:<id>". Balasan: { favorites: string[], degraded }.
 */
export const GET = handleRead(
  async () => {
    const player = await currentPlayer();
    return Response.json({ favorites: listFavorites(player.id), degraded: false });
  },
  () => ({ favorites: [] }),
);
