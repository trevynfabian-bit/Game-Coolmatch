import { handleRead } from "@/server/api/http";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";
import { currentPlayer } from "@/server/services/player-session";
import { getEffectiveWeapons } from "@/server/services/shop-service";

/**
 * GET /api/senjata/efektif — statistik tiap senjata sesudah upgrade dan
 * attachment pemain diterapkan. Dipakai arena supaya yang dibeli di toko
 * benar-benar terasa saat menembak.
 *
 * Balasan: { weapons: [{ weaponId, base, effective, upgrades }], degraded }.
 * Cadangan saat database gagal: statistik dasar tanpa upgrade.
 */
export const GET = handleRead(
  async () => {
    const player = await currentPlayer();
    return Response.json({ weapons: getEffectiveWeapons(player.id), degraded: false });
  },
  () => ({
    weapons: MOCK_WEAPONS.map((base) => ({
      weaponId: base.id,
      base,
      effective: base,
      upgrades: { weaponId: base.id, levels: { damage: 0, accuracy: 0, reload: 0 }, ownedAttachmentIds: [], equipped: {} },
    })),
  }),
);
