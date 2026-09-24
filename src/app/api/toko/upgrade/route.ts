import { UPGRADE_STATS } from "@/server/db/schema";
import { enumField, handle, intField, readJsonObject, stringField } from "@/server/api/http";
import { currentPlayer } from "@/server/services/player-session";
import { buyUpgrade } from "@/server/services/shop-service";

/**
 * POST /api/toko/upgrade — menaikkan satu statistik senjata satu tingkat.
 *
 * Badan: { weaponId, stat: "damage" | "accuracy" | "reload", level? }.
 * `level` adalah tingkat yang hendak dibeli; bila tidak sama dengan tingkat
 * berikutnya di server, balasannya 409 `tingkat_berubah` dan koin tidak
 * dipotong. Tingkat tidak bisa dilompati.
 *
 * Balasan 200: { weapon, wallet, transaction }.
 */
export const POST = handle(async (request: Request) => {
  const body = await readJsonObject(request);
  const weaponId = stringField(body.weaponId, "weaponId");
  const stat = enumField(body.stat, "stat", UPGRADE_STATS);
  const level = body.level === undefined ? undefined : intField(body.level, "level", { min: 1, max: 10 });

  const player = await currentPlayer();
  return Response.json(buyUpgrade(player.id, weaponId, stat, level));
});
