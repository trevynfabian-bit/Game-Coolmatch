import { handle, handleRead, readJsonObject, stringField } from "@/server/api/http";
import { DEFAULT_LOADOUT_WEAPON_ID, getWeaponLoadout, saveWeaponLoadout } from "@/server/services/weapon-service";
import { currentPlayer } from "@/server/services/player-session";

/**
 * GET /api/senjata/loadout — senjata yang dibawa pemain masuk arena:
 * { loadout: { primaryWeaponId, updatedAt }, degraded }. Senjata yang tidak
 * lagi terbuka diganti senjata bawaan.
 */
export const GET = handleRead(
  async () => {
    const player = await currentPlayer();
    return Response.json({ loadout: getWeaponLoadout(player.id), degraded: false });
  },
  () => ({ loadout: { primaryWeaponId: DEFAULT_LOADOUT_WEAPON_ID, updatedAt: null } }),
);

/**
 * POST /api/senjata/loadout — menyimpan senjata utama. Badan: { weaponId }.
 * 404 bila senjata tidak dikenal, 409 senjata_terkunci bila belum terbuka.
 * Balasan: { loadout }.
 */
export const POST = handle(async (request: Request) => {
  const body = await readJsonObject(request);
  const player = await currentPlayer();
  const loadout = saveWeaponLoadout(player.id, stringField(body.weaponId, "weaponId"));
  return Response.json({ loadout });
});
