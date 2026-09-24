import { handle, handleRead, readJsonObject } from "@/server/api/http";
import { DEFAULT_LOADOUT, KILLSTREAKS } from "@/lib/game/killstreak";
import { getLoadout, getRewardsFor, saveLoadout } from "@/server/services/killstreak-service";
import { currentPlayer } from "@/server/services/player-session";

/**
 * GET /api/killstreak/loadout — loadout hadiah killstreak pemain beserta
 * katalog hadiah dan status terbukanya.
 *
 * Balasan: { loadout: [id | null, id | null, id | null], rewards, degraded }.
 * Urutan loadout = tombol 6, 7, 8 di arena.
 */
export const GET = handleRead(
  async () => {
    const player = await currentPlayer();
    return Response.json({
      loadout: getLoadout(player.id),
      rewards: getRewardsFor(player.id),
      degraded: false,
    });
  },
  () => ({
    loadout: DEFAULT_LOADOUT,
    rewards: KILLSTREAKS.map((item) => ({
      id: item.id,
      name: item.name,
      kills: item.kills,
      durationSeconds: item.durationSeconds,
      unlockPrice: item.unlockPrice,
      unlocked: item.unlockPrice === 0,
    })),
  }),
);

/**
 * POST /api/killstreak/loadout — menyimpan loadout.
 *
 * Badan: { slots: [id | null, id | null, id | null] }. Hadiah ganda → 400
 * `hadiah_ganda`; hadiah belum terbuka → 409 `hadiah_terkunci`.
 * Balasan 200: { loadout }.
 */
export const POST = handle(async (request: Request) => {
  const body = await readJsonObject(request);
  const player = await currentPlayer();
  return Response.json({ loadout: saveLoadout(player.id, body.slots) });
});
