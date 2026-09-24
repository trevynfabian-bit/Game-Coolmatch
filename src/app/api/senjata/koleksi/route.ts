import { handleRead } from "@/server/api/http";
import { evaluateWeaponUnlocks } from "@/server/services/weapon-unlock-service";
import { currentPlayer } from "@/server/services/player-session";

/**
 * GET /api/senjata/koleksi — koleksi senjata pemain, dipisah antara yang
 * sudah dimiliki (urut terbaru terbuka, dengan penanda `isNew` bila
 * pemberitahuannya belum dilihat) dan yang masih terkunci (dengan syarat dan
 * kemajuannya, yang paling dekat terbuka lebih dulu).
 * Balasan: { owned: [{ weaponId, name, type, via, unlockedAt, isNew }],
 * locked: [{ weaponId, name, type, requirement, progress, progressLabel }],
 * counts: { owned, total, new }, progress, degraded }.
 */
export const GET = handleRead(
  async () => {
    const player = await currentPlayer();
    const { weapons, progress } = evaluateWeaponUnlocks(player.id);
    const owned = weapons
      .filter((weapon) => weapon.ownership.isUnlocked)
      .map((weapon) => ({
        weaponId: weapon.id,
        name: weapon.name,
        type: weapon.type,
        via: weapon.via ?? "bawaan",
        unlockedAt: weapon.unlockedAt,
        isNew: weapon.isNew,
      }))
      .sort((a, b) => (b.unlockedAt ?? 0) - (a.unlockedAt ?? 0));
    const locked = weapons
      .filter((weapon) => !weapon.ownership.isUnlocked)
      .map((weapon) => ({
        weaponId: weapon.id,
        name: weapon.name,
        type: weapon.type,
        requirement: weapon.ownership.requirement,
        progress: weapon.ownership.progress ?? 0,
        progressLabel: weapon.ownership.progressLabel,
      }))
      .sort((a, b) => b.progress - a.progress);
    return Response.json({
      owned,
      locked,
      counts: { owned: owned.length, total: weapons.length, new: owned.filter((item) => item.isNew).length },
      progress,
      degraded: false,
    });
  },
  () => ({ owned: [], locked: [], counts: { owned: 0, total: 0, new: 0 }, progress: { wins: 0, totalKills: 0 } }),
);
