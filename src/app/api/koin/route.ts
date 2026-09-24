import { handleRead } from "@/server/api/http";
import { getWallet } from "@/server/services/coin-service";
import { currentPlayer } from "@/server/services/player-session";

/**
 * GET /api/koin — saldo dompet koin pemain saat ini.
 *
 * Balasan: { wallet: { balance, lifetimeEarned, updatedAt }, degraded: false }.
 * Bila database gagal dibaca, saldo nol dikirim dengan `degraded: true` supaya
 * menu utama dan HUD tetap tampil dan bisa menandai angkanya belum pasti.
 */
export const GET = handleRead(
  async () => {
    const player = await currentPlayer();
    return Response.json({ wallet: getWallet(player.id), degraded: false });
  },
  () => ({ wallet: { balance: 0, lifetimeEarned: 0, updatedAt: 0 } }),
);
