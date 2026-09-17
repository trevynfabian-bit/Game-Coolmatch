import { jsonError, jsonOk, readJsonBody } from "@/server/api/json";
import { parseKill, recordKill } from "@/server/matches/match-store";

/**
 * Merekam satu tembakan mematikan ke dalam sebuah pertandingan: penembak
 * bertambah kill beserta nilainya, korban bertambah kematian.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Id pertandingan dari alamat; harus bilangan bulat positif. */
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

  const parsed = parseKill(body.body);
  if (!parsed.ok) {
    return jsonError(400, parsed.message);
  }

  const hasil = recordKill(matchId, parsed.value);
  if (!hasil.ok) {
    return jsonError(hasil.status, hasil.message);
  }

  return jsonOk({ killer: hasil.killer, victim: hasil.victim });
}
