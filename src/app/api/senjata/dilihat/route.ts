import { ApiError, handle, readJsonObject, stringField } from "@/server/api/http";
import { findCatalogWeapon } from "@/server/services/weapon-service";
import { markWeaponsSeen } from "@/server/services/weapon-unlock-service";
import { currentPlayer } from "@/server/services/player-session";

/**
 * POST /api/senjata/dilihat — konfirmasi senjata baru sudah dilihat.
 * Badan: { weaponId } untuk satu senjata atau { all: true } untuk semua.
 * Notifikasi senjata yang sama ikut ditandai dilihat. Idempoten.
 * Balasan: { updated }.
 */
export const POST = handle(async (request: Request) => {
  const body = await readJsonObject(request);
  let weaponId: string | null = null;
  if (body.all !== true) {
    weaponId = stringField(body.weaponId, "weaponId");
    if (!findCatalogWeapon(weaponId)) throw new ApiError(404, "senjata_tidak_ada", "Senjata tidak dikenal.");
  }
  const player = await currentPlayer();
  return Response.json({ updated: markWeaponsSeen(player.id, weaponId) });
});
