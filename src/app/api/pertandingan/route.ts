import { DIFFICULTIES } from "@/server/db/schema";
import {
  enumField,
  handle,
  intField,
  readJsonObject,
  stringField,
} from "@/server/api/http";
import { MATCH_RULES } from "@/lib/game/match-rules";
import { startMatch } from "@/server/services/match-service";
import { currentPlayer } from "@/server/services/player-session";

/**
 * POST /api/pertandingan — membuat baris pertandingan saat arena dibuka.
 *
 * Badan: { mapId, difficulty, botCount, totalRounds?, scoreLimit?,
 * roundSeconds?, isTrial? }. `isTrial: true` untuk latihan dan uji coba
 * senjata — sesi itu tercatat tapi tidak pernah menghasilkan koin. Aturan
 * ronde yang dikosongkan diisi server; pertandingan biasa wajib memakai aturan
 * standar (400 aturan_tidak_sah) dan jumlah lawan dibatasi kapasitas peta.
 * Balasan 201: { match: { id, ..., killstreakLoadout } }. Id ini yang dipakai
 * untuk menutup pertandingan lewat /api/pertandingan/[id]/selesai, dan
 * `killstreakLoadout` adalah hadiah yang sah dipakai di pertandingan ini.
 */
export const POST = handle(async (request: Request) => {
  const body = await readJsonObject(request);
  const isTrial = body.isTrial === true;
  const rules = MATCH_RULES[isTrial ? "uji_coba" : "standar"];
  const player = await currentPlayer();

  const match = startMatch(player.id, {
    mapId: stringField(body.mapId, "mapId"),
    difficulty: enumField(body.difficulty, "difficulty", DIFFICULTIES),
    botCount: intField(body.botCount, "botCount", { min: 1, max: 16 }),
    // Aturan ronde boleh dikosongkan: server mengisinya dari aturan mode ini.
    totalRounds: intField(body.totalRounds, "totalRounds", { min: 1, max: 15, fallback: rules.totalRounds }),
    scoreLimit: intField(body.scoreLimit, "scoreLimit", { min: 1, max: 100, fallback: rules.scoreLimit }),
    roundSeconds: intField(body.roundSeconds, "roundSeconds", { min: 10, max: 1800, fallback: rules.roundSeconds }),
    isTrial,
  });

  return Response.json({ match }, { status: 201 });
});
