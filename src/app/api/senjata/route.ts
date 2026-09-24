import { handleRead } from "@/server/api/http";
import { evaluateWeaponUnlocks } from "@/server/services/weapon-unlock-service";
import { currentPlayer } from "@/server/services/player-session";

/**
 * GET /api/senjata — daftar senjata beserta kepemilikan pemain: statistik
 * dasar, syarat membuka, dan kemajuan menuju syarat itu dari riwayat
 * pertandingan sungguhan. Senjata yang syaratnya baru terpenuhi dicatat
 * terbuka saat itu juga. Balasan: { weapons: [{ ...senjata, ownership,
 * unlockedAt, isNew }], progress: { wins, totalKills }, newlyUnlocked, degraded }.
 */
export const GET = handleRead(
  async () => {
    const player = await currentPlayer();
    const { progress, weapons, newlyUnlocked } = evaluateWeaponUnlocks(player.id);
    return Response.json({ progress, weapons, newlyUnlocked, degraded: false });
  },
  () => ({ weapons: [], progress: { wins: 0, totalKills: 0 } }),
);
