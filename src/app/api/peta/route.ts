import { handleRead } from "@/server/api/http";
import { maxBotsForMap } from "@/lib/mock/bots";
import { listMaps } from "@/server/services/map-service";

/**
 * GET /api/peta — daftar peta modular dalam bentuk ringkas untuk layar Pilih
 * Peta: { maps: [{ id, name, description, previewUrl, floorSize, blockCount,
 * spawnCount, maxBots }], degraded }. Balok lengkap ada di /api/peta/[id].
 */
export const GET = handleRead(
  async () =>
    Response.json({
      maps: listMaps().map((map) => ({
        id: map.id,
        name: map.name,
        description: map.description,
        previewUrl: map.previewUrl,
        floorSize: map.floorSize,
        skyColor: map.skyColor,
        blockCount: map.blocks.length,
        spawnCount: map.spawnPoints.length,
        maxBots: maxBotsForMap(map),
      })),
      degraded: false,
    }),
  () => ({ maps: [] }),
);
