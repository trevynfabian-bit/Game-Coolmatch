import { handle, readJsonObject, stringField } from "@/server/api/http";
import { currentPlayer } from "@/server/services/player-session";
import { setWeaponSkin } from "@/server/services/skin-service";

/**
 * POST /api/skin/pasang — memasang skin milik pemain ke satu senjata.
 *
 * Badan: { weaponId, skinId: string | null }. `null` mengembalikan senjata ke
 * cat pabrik. Skin yang belum dimiliki ditolak 409 `belum_dimiliki`.
 * Balasan 200: { collection }.
 */
export const POST = handle(async (request: Request) => {
  const body = await readJsonObject(request);
  const weaponId = stringField(body.weaponId, "weaponId");
  const skinId = body.skinId === null ? null : stringField(body.skinId, "skinId");
  const player = await currentPlayer();
  return Response.json({ collection: setWeaponSkin(player.id, weaponId, skinId) });
});
