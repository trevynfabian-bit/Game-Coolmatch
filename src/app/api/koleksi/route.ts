import { handleRead } from "@/server/api/http";
import { SKINS } from "@/lib/economy/skin-catalog";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";
import { getPlayerCollection } from "@/server/services/collection-service";
import { currentPlayer } from "@/server/services/player-session";

/**
 * GET /api/koleksi — seluruh koleksi pemain untuk galeri dalam satu balasan:
 * { weapons, skins, ownedSkins, upgrades, favorites, totals, degraded }.
 */
export const GET = handleRead(
  async () => {
    const player = await currentPlayer();
    return Response.json({ ...getPlayerCollection(player.id), degraded: false });
  },
  () => ({
    weapons: [],
    skins: { ownedSkinIds: [], equipped: {} },
    ownedSkins: [],
    upgrades: [],
    favorites: [],
    totals: {
      weaponsUnlocked: 0,
      weaponsTotal: MOCK_WEAPONS.length,
      skinsOwned: 0,
      skinsTotal: SKINS.length,
      attachmentsOwned: 0,
    },
  }),
);
