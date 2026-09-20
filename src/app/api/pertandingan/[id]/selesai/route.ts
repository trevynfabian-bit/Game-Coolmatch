import { jsonError, jsonOk, readJsonBody } from "@/server/api/json";
import { finishMatch, parseFinishMatch } from "@/server/matches/match-store";

/**
 * Menutup sebuah pertandingan dan menetapkan hasil akhirnya, baik karena
 * benar-benar selesai maupun karena ditinggal pemain di tengah jalan.
 *
 * Jawabannya adalah ringkasan akhir lengkap — aturan pertandingan, hasil tiap
 * ronde, dan klasemen akhir yang sudah terurut — DITAMBAH kemajuan pemain
 * sesudah pertandingan ini beserta senjata yang terbuka karenanya. Ketiganya
 * dikirim sekaligus supaya layar ringkasan tidak perlu memanggil apa pun lagi:
 * ia sudah ingin merayakan senjata baru tepat saat peluit berbunyi, dan
 * permintaan kedua di saat itu berarti perayaan yang datang terlambat — atau
 * tidak datang sama sekali kalau permintaannya gagal.
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

  const parsed = parseFinishMatch(body.body);
  if (!parsed.ok) {
    return jsonError(400, parsed.message);
  }

  const hasil = finishMatch(matchId, parsed.value);
  if (!hasil.ok) {
    return jsonError(hasil.status, hasil.message);
  }

  return jsonOk(
    { ...hasil.summary, progress: hasil.progress },
    { headers: { "Cache-Control": "no-store" } },
  );
}
