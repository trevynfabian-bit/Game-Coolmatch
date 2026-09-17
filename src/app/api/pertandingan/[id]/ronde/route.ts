import { jsonError, jsonOk, readJsonBody } from "@/server/api/json";
import { finishRound, parseFinishRound } from "@/server/matches/match-store";

/**
 * Menutup satu ronde sebuah pertandingan.
 *
 * Yang dikirim klien hanyalah FAKTA ronde itu — siapa membunuh berapa kali.
 * Siapa yang memenangkannya, dan apakah pertandingannya ikut berakhir,
 * disimpulkan server memakai aturan yang sama dengan arena. Server tidak
 * pernah menerima klaim "si anu menang".
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseMatchId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const matchId = parseMatchId((await params).id);
  if (matchId === null) {
    return jsonError(400, "Id pertandingan harus bilangan bulat positif.");
  }

  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(400, "Badan permintaan bukan JSON yang sah.");
  }

  const parsed = parseFinishRound(body.body);
  if (!parsed.ok) {
    return jsonError(400, parsed.message);
  }

  const hasil = finishRound(matchId, parsed.value);
  if (!hasil.ok) {
    return jsonError(hasil.status, hasil.message);
  }

  return jsonOk(
    {
      roundWinner: hasil.roundWinner,
      matchEnded: hasil.matchEnded,
      matchWinner: hasil.matchWinner,
      result: hasil.result,
      scoreboard: hasil.scoreboard,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
