import { DIFFICULTIES } from "@/server/db/schema";
import {
  enumField,
  handle,
  intField,
  readJsonObject,
  stringField,
} from "@/server/api/http";
import { startMatch } from "@/server/services/match-service";
import { currentPlayer } from "@/server/services/player-session";

/**
 * POST /api/pertandingan — membuat baris pertandingan saat arena dibuka.
 *
 * Badan: { mapId, difficulty, botCount, totalRounds, scoreLimit, roundSeconds,
 * isTrial? }. `isTrial: true` untuk latihan dan uji coba senjata — sesi itu
 * tercatat tapi tidak pernah menghasilkan koin.
 * Balasan 201: { match: { id, ..., killstreakLoadout } }. Id ini yang dipakai
 * untuk menutup pertandingan lewat /api/pertandingan/[id]/selesai, dan
 * `killstreakLoadout` adalah hadiah yang sah dipakai di pertandingan ini.
 */
export const POST = handle(async (request: Request) => {
  const body = await readJsonObject(request);
  const player = await currentPlayer();

  const match = startMatch(player.id, {
    mapId: stringField(body.mapId, "mapId"),
    difficulty: enumField(body.difficulty, "difficulty", DIFFICULTIES),
    botCount: intField(body.botCount, "botCount", { min: 1, max: 16 }),
    totalRounds: intField(body.totalRounds, "totalRounds", { min: 1, max: 15 }),
    scoreLimit: intField(body.scoreLimit, "scoreLimit", { min: 1, max: 100 }),
    roundSeconds: intField(body.roundSeconds, "roundSeconds", { min: 10, max: 1800 }),
    isTrial: body.isTrial === true,
  });

  return Response.json({ match }, { status: 201 });
});
