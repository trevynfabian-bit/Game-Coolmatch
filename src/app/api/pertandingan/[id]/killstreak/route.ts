import { KILLSTREAK_EVENT_KINDS, KILLSTREAK_IDS } from "@/server/db/schema";
import {
  enumField,
  handle,
  handleRead,
  intField,
  readJsonObject,
  routeId,
} from "@/server/api/http";
import { getMatchRewardSummary, recordKillstreakEvent } from "@/server/services/killstreak-service";
import { currentPlayer } from "@/server/services/player-session";

/**
 * GET /api/pertandingan/[id]/killstreak — ringkasan hadiah killstreak sebuah
 * pertandingan: [{ rewardId, unlocked, used, kills }].
 */
export const GET = handleRead(
  async (_request: Request, ctx: RouteContext<"/api/pertandingan/[id]/killstreak">) => {
    const { id } = await ctx.params;
    await currentPlayer();
    return Response.json({ rewards: getMatchRewardSummary(routeId(id)), degraded: false });
  },
  () => ({ rewards: [] }),
);

/**
 * POST /api/pertandingan/[id]/killstreak — mencatat kejadian killstreak.
 *
 * Badan: { rewardId, kind: "terbuka" | "dipakai" | "kill", streak }.
 * Server memeriksa urutan yang masuk akal (terbuka → dipakai → kill) dan
 * ambang kill beruntun. Balasan 201: { rewards: ringkasan terbaru }.
 */
export const POST = handle(
  async (request: Request, ctx: RouteContext<"/api/pertandingan/[id]/killstreak">) => {
    const { id } = await ctx.params;
    const matchId = routeId(id, "Id pertandingan");
    const body = await readJsonObject(request);
    const player = await currentPlayer();
    const rewards = recordKillstreakEvent(player.id, matchId, {
      rewardId: enumField(body.rewardId, "rewardId", KILLSTREAK_IDS),
      kind: enumField(body.kind, "kind", KILLSTREAK_EVENT_KINDS),
      streak: intField(body.streak, "streak", { max: 1000, fallback: 0 }),
    });
    return Response.json({ rewards }, { status: 201 });
  },
);
