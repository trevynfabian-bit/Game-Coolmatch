import { ApiError, handle } from "@/server/api/http";
import { maxBotsForMap } from "@/lib/mock/bots";
import { getMap } from "@/server/services/map-service";

/**
 * GET /api/peta/[id] — satu peta lengkap: lantai, batas area main, warna,
 * seluruh balok penyusun, dan titik muncul. Bentuknya sama dengan
 * `ArenaMapInfo` di klien, jadi bisa langsung dipakai arena.
 * Balasan: { map: {...}, maxBots }. 404 bila peta tidak dikenal.
 */
export const GET = handle(async (_request: Request, ctx: RouteContext<"/api/peta/[id]">) => {
  const { id } = await ctx.params;
  if (!/^[a-z0-9-]{1,64}$/.test(id)) throw new ApiError(400, "id_tidak_sah", "Id peta tidak sah.");
  const map = getMap(id);
  if (!map) throw new ApiError(404, "peta_tidak_ada", "Peta tidak dikenal.");
  return Response.json({ map, maxBots: maxBotsForMap(map) });
});
