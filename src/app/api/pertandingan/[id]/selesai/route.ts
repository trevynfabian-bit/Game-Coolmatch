import { handle, intField, readJsonObject, routeId } from "@/server/api/http";
import { parseParticipants, parseRounds } from "@/server/api/match-parsers";
import { finishMatch } from "@/server/services/match-service";
import { currentPlayer } from "@/server/services/player-session";

/**
 * POST /api/pertandingan/[id]/selesai — menutup pertandingan dan mengkredit koin.
 *
 * Badan: { participants: [{ name, isBot, kills, deaths, score, roundWins }],
 * rounds?: [{ roundNumber, endedReason, standings: [{ name, roundKills, deaths }] }],
 * bestStreak?, abandoned? }. Bila `rounds` dikirim, server memutus ulang
 * pemenang tiap ronde dan menurunkan ronde menang dari putusan itu (400
 * ronde_tidak_sah bila catatannya tidak masuk akal). Server menentukan juara dan
 * hasil, menyimpan perolehan, lalu membayar koin sesuai aturan di
 * `lib/economy/coin-rules`. Balasan: { matchId, result, winnerName, coins }.
 * Aman dikirim ulang — koin tidak dibayar dua kali.
 */
export const POST = handle(
  async (request: Request, ctx: RouteContext<"/api/pertandingan/[id]/selesai">) => {
    const { id } = await ctx.params;
    const matchId = routeId(id, "Id pertandingan");
    const body = await readJsonObject(request);
    const player = await currentPlayer();

    const outcome = finishMatch(player.id, matchId, {
      participants: parseParticipants(body.participants),
      rounds: parseRounds(body.rounds),
      bestStreak: intField(body.bestStreak, "bestStreak", { max: 10_000, fallback: 0 }),
      abandoned: body.abandoned === true,
    });

    return Response.json(outcome);
  },
);
