import { handleRead } from "@/server/api/http";
import { getWallet } from "@/server/services/coin-service";
import { currentPlayer } from "@/server/services/player-session";
import { getPlayerUpgrades } from "@/server/services/shop-service";

/**
 * GET /api/toko — kepemilikan toko pemain saat ini: tingkat upgrade dan
 * attachment per senjata, beserta saldo dompet.
 *
 * Balasan: { upgrades: WeaponUpgradeState[], wallet, degraded }.
 */
export const GET = handleRead(
  async () => {
    const player = await currentPlayer();
    return Response.json({
      upgrades: getPlayerUpgrades(player.id),
      wallet: getWallet(player.id),
      degraded: false,
    });
  },
  () => ({ upgrades: [], wallet: { balance: 0, lifetimeEarned: 0, updatedAt: 0 } }),
);
