import { handle, handleRead, readJsonObject, stringField } from "@/server/api/http";
import { MOCK_MAPS } from "@/lib/mock/maps";
import { getMapChoice, saveMapChoice } from "@/server/services/map-service";
import { currentPlayer } from "@/server/services/player-session";

/**
 * GET /api/peta/pilihan — peta yang terakhir dipilih pemain:
 * { choice: { mapId, updatedAt | null }, degraded }. `updatedAt` null berarti
 * pemain belum pernah memilih dan yang dikirim adalah peta bawaan.
 */
export const GET = handleRead(
  async () => {
    const player = await currentPlayer();
    return Response.json({ choice: getMapChoice(player.id), degraded: false });
  },
  () => ({ choice: { mapId: MOCK_MAPS[0].id, updatedAt: null } }),
);

/**
 * POST /api/peta/pilihan — menyimpan peta pilihan. Badan: { mapId }.
 * 404 bila peta tidak dikenal. Balasan: { choice: { mapId, updatedAt } }.
 */
export const POST = handle(async (request: Request) => {
  const body = await readJsonObject(request);
  const player = await currentPlayer();
  return Response.json({ choice: saveMapChoice(player.id, stringField(body.mapId, "mapId")) });
});
