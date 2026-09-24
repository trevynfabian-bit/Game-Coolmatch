import { DIFFICULTIES } from "@/server/db/schema";
import { enumField, handle, intField, readJsonObject, stringField } from "@/server/api/http";
import { DEFAULT_MAP } from "@/lib/mock/maps";
import { startTrial } from "@/server/services/trial-service";
import { currentPlayer } from "@/server/services/player-session";

/**
 * POST /api/uji-coba — memulai sesi uji coba senjata (satu ronde kilat,
 * tanpa koin dan tanpa statistik). Senjata yang masih terkunci boleh dicoba.
 * Badan: { weaponId, difficulty, botCount, mapId? }.
 * Balasan 201: { match: { id, ..., killstreakLoadout }, session: { id, weaponWasLocked, ... } }.
 */
export const POST = handle(async (request: Request) => {
  const body = await readJsonObject(request);
  const player = await currentPlayer();
  const result = startTrial(player.id, {
    weaponId: stringField(body.weaponId, "weaponId"),
    difficulty: enumField(body.difficulty, "difficulty", DIFFICULTIES),
    botCount: intField(body.botCount, "botCount", { min: 1, max: 16 }),
    mapId: stringField(body.mapId, "mapId", { fallback: DEFAULT_MAP.id }),
  });
  return Response.json(result, { status: 201 });
});
