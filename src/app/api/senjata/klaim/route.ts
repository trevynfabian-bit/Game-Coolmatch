import { ApiError, handle, readJsonObject, stringField } from "@/server/api/http";
import { findCatalogWeapon } from "@/server/services/weapon-service";
import { claimWeapon } from "@/server/services/weapon-unlock-service";
import { currentPlayer } from "@/server/services/player-session";

/**
 * POST /api/senjata/klaim — mengklaim senjata baru dari koleksi: tandai
 * dilihat dan pasang sebagai senjata utama loadout. Badan: { weaponId }.
 * 404 senjata tidak dikenal, 409 belum_dimiliki.
 * Balasan: { weaponId, loadout: { primaryWeaponId, updatedAt }, unlockedAt, via }.
 */
export const POST = handle(async (request: Request) => {
  const body = await readJsonObject(request);
  const weaponId = stringField(body.weaponId, "weaponId");
  if (!findCatalogWeapon(weaponId)) throw new ApiError(404, "senjata_tidak_ada", "Senjata tidak dikenal.");
  const player = await currentPlayer();
  return Response.json(claimWeapon(player.id, weaponId));
});
