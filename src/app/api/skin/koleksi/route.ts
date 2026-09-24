import { handleRead } from "@/server/api/http";
import { RARITY_ORDER, SKINS } from "@/lib/economy/skin-catalog";
import { currentPlayer } from "@/server/services/player-session";
import { getSkinCollectionReport } from "@/server/services/skin-service";

/**
 * GET /api/skin/koleksi — daftar kepemilikan skin pemain untuk halaman
 * "Skin Milikku".
 *
 * Balasan: { owned: [{ skin, purchasedAt, equippedOn: weaponId[] }], equipped,
 * completion: [{ rarity, owned, total }], totalOwned, totalCatalog, degraded }.
 */
export const GET = handleRead(
  async () => {
    const player = await currentPlayer();
    return Response.json({ ...getSkinCollectionReport(player.id), degraded: false });
  },
  () => ({
    owned: [],
    equipped: {},
    completion: RARITY_ORDER.map((rarity) => ({
      rarity,
      owned: 0,
      total: SKINS.filter((skin) => skin.rarity === rarity).length,
    })),
    totalOwned: 0,
    totalCatalog: SKINS.length,
  }),
);
