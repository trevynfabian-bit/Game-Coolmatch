import { handleRead } from "@/server/api/http";
import { listPlayerWeapons } from "@/server/services/weapon-service";
import { currentPlayer } from "@/server/services/player-session";

/**
 * GET /api/senjata — daftar senjata beserta kepemilikan pemain: statistik
 * dasar, syarat membuka, dan kemajuan menuju syarat itu dari riwayat
 * pertandingan sungguhan. Balasan: { weapons: [{ ...senjata, ownership }],
 * progress: { wins, totalKills }, degraded }.
 */
export const GET = handleRead(
  async () => {
    const player = await currentPlayer();
    return Response.json({ ...listPlayerWeapons(player.id), degraded: false });
  },
  () => ({ weapons: [], progress: { wins: 0, totalKills: 0 } }),
);
