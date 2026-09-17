import { jsonError, jsonOk } from "@/server/api/json";
import { loadLiveScoreboard } from "@/server/matches/match-store";

/**
 * Papan skor sebuah pertandingan, berjalan maupun sudah selesai.
 *
 * Dipaksa dinamis dan tanpa cache. Isi jawaban ini berubah tiap kali ada yang
 * tumbang; jawaban yang dibekukan — entah saat build atau di perantara — akan
 * menyajikan papan skor yang sudah basi persis pada saat pemain paling ingin
 * melihat angka terbaru.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseMatchId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const matchId = parseMatchId((await params).id);
  if (matchId === null) {
    return jsonError(400, "Id pertandingan harus bilangan bulat positif.");
  }

  const papan = loadLiveScoreboard(matchId);
  if (!papan) {
    return jsonError(404, "Pertandingan tidak ditemukan.");
  }

  return jsonOk(papan, {
    headers: { "Cache-Control": "no-store" },
  });
}
