import {
  ApiError,
  handle,
  handleRead,
  intField,
  readJsonObject,
  routeId,
  stringField,
} from "@/server/api/http";
import { getLiveScore, recordKillEvents, type KillEventInput } from "@/server/services/match-event-service";
import { currentPlayer } from "@/server/services/player-session";

const MAX_BATCH = 100;

function parseEvents(value: unknown): KillEventInput[] {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_BATCH) {
    throw new ApiError(400, "isian_tidak_sah", `"events" harus daftar 1..${MAX_BATCH} kejadian.`);
  }
  return value.map((item, index) => {
    const e = (item ?? {}) as Record<string, unknown>;
    return {
      seq: intField(e.seq, `events[${index}].seq`, { min: 1, max: 100_000 }),
      roundNumber: intField(e.roundNumber, `events[${index}].roundNumber`, { min: 1, max: 15 }),
      killerName: stringField(e.killerName, "killerName", { maxLength: 40 }),
      victimName: stringField(e.victimName, "victimName", { maxLength: 40 }),
      weaponName: stringField(e.weaponName, "weaponName", { maxLength: 60 }),
      isHeadshot: e.isHeadshot === true,
      atSecond: intField(e.atSecond, "atSecond", { max: 1800, fallback: 0 }),
    };
  });
}

/**
 * GET /api/pertandingan/[id]/kejadian — skor langsung pertandingan dari
 * kejadian kill yang sudah diterima server:
 * { score: { matchId, roundNumber, lastSeq, totalKills, standings, ended } }.
 */
export const GET = handleRead(
  async (_request: Request, ctx: RouteContext<"/api/pertandingan/[id]/kejadian">) => {
    const { id } = await ctx.params;
    const player = await currentPlayer();
    return Response.json({ score: getLiveScore(player.id, routeId(id, "Id pertandingan")), degraded: false });
  },
  () => ({ score: null }),
);

/**
 * POST /api/pertandingan/[id]/kejadian — mengirim sekumpulan kejadian kill.
 * Badan: { events: [{ seq, roundNumber, killerName, victimName, weaponName,
 * isHeadshot, atSecond }] }. Idempoten per `seq`; pertandingan yang sudah
 * selesai menolak dengan 409. Balasan: { score } terbaru.
 */
export const POST = handle(
  async (request: Request, ctx: RouteContext<"/api/pertandingan/[id]/kejadian">) => {
    const { id } = await ctx.params;
    const matchId = routeId(id, "Id pertandingan");
    const events = parseEvents((await readJsonObject(request)).events);
    const player = await currentPlayer();
    return Response.json({ score: recordKillEvents(player.id, matchId, events) });
  },
);
