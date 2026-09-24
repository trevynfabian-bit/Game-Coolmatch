import { handle, handleRead, readJsonObject } from "@/server/api/http";
import { DEFAULT_LOADOUT, KILLSTREAKS } from "@/lib/game/killstreak";
import { getLoadout, getRewardsFor, saveLoadout } from "@/server/services/killstreak-service";
import { getAchievementStats } from "@/server/services/player-stats-service";
import { currentPlayer } from "@/server/services/player-session";

/**
 * GET /api/killstreak/loadout — loadout hadiah killstreak pemain beserta
 * katalog hadiah dan status terbukanya.
 *
 * Balasan: { loadout: [id | null, id | null, id | null], rewards, stats, degraded }.
 * Urutan loadout = tombol 6, 7, 8 di arena. `rewards` berisi harga buka,
 * syarat pencapaian, dan status terbuka; `stats` adalah statistik pemain
 * (totalKills, bestStreak, wins) untuk menampilkan kemajuan syarat itu.
 * Hadiah yang syarat pencapaiannya sudah terpenuhi otomatis terbuka di sini.
 */
export const GET = handleRead(
  async () => {
    const player = await currentPlayer();
    const stats = getAchievementStats(player.id);
    const rewards = getRewardsFor(player.id, stats);
    return Response.json({ loadout: getLoadout(player.id), rewards, stats, degraded: false });
  },
  () => ({
    loadout: DEFAULT_LOADOUT,
    rewards: KILLSTREAKS.map((item) => ({
      id: item.id,
      name: item.name,
      kills: item.kills,
      durationSeconds: item.durationSeconds,
      unlockPrice: item.unlockPrice,
      unlockAchievement: item.unlockAchievement,
      unlocked: item.unlockPrice === 0,
      unlockedVia: item.unlockPrice === 0 ? "gratis" : null,
    })),
    stats: { totalKills: 0, bestStreak: 0, wins: 0 },
  }),
);

/**
 * POST /api/killstreak/loadout — menyimpan loadout (tombol 6, 7, 8).
 *
 * Badan: { slots: [id | null, id | null, id | null] }. Validasi server:
 * tepat tiga slot (400 `loadout_tidak_sah`), id dikenal (400
 * `hadiah_tidak_dikenal`), tanpa hadiah ganda (400 `hadiah_ganda`), dan semua
 * hadiah sudah terbuka (409 `hadiah_terkunci`). Tidak ada yang tersimpan bila
 * salah satu gagal.
 *
 * Balasan 200: { loadout, rewards, savedAt } — loadout sebagaimana tersimpan.
 */
export const POST = handle(async (request: Request) => {
  const body = await readJsonObject(request);
  const player = await currentPlayer();
  const loadout = saveLoadout(player.id, body.slots);
  return Response.json({ loadout, rewards: getRewardsFor(player.id), savedAt: Date.now() });
});
