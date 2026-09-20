import { jsonError, jsonOk, readJsonBody } from "@/server/api/json";
import { parseHit, recordHit } from "@/server/matches/match-store";

/**
 * Melaporkan satu peluru yang mengenai peserta: siapa menembak siapa, berapa
 * kerusakannya, dan apakah mengenai kepala. Kill tidak dicatat di sini —
 * peluru yang mematikan tetap dilaporkan lewat endpoint kill.
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

  const parsed = parseHit(body.body);
  if (!parsed.ok) {
    return jsonError(400, parsed.message);
  }

  const hasil = recordHit(matchId, parsed.value);
  if (!hasil.ok) {
    return jsonError(hasil.status, hasil.message);
  }

  return jsonOk({ shooter: hasil.shooter, target: hasil.target });
}
