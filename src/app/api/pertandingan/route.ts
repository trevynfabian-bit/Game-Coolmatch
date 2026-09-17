import { jsonError, jsonOk, readJsonBody } from "@/server/api/json";
import { parseStartMatch, startMatch } from "@/server/matches/match-store";
import { ensureLocalPlayer } from "@/server/players/local-player";

/**
 * Membuka pertandingan baru di server.
 *
 * Dipanggil saat arena mulai, bukan saat selesai. Barisnya dibuat lebih dulu
 * supaya kejadian selama pertandingan punya tempat untuk dicatat, dan supaya
 * pertandingan yang ditinggal di tengah jalan tetap meninggalkan jejak alih-
 * alih hilang seolah tidak pernah dimainkan.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(400, "Badan permintaan bukan JSON yang sah.");
  }

  const parsed = parseStartMatch(body.body);
  if (!parsed.ok) {
    return jsonError(400, parsed.message);
  }

  const player = ensureLocalPlayer();
  const matchId = startMatch(player.id, parsed.value);

  // 201 beserta lokasi sumbernya: pemanggil memakai id ini untuk mencatat
  // kejadian dan, nanti, menutup pertandingannya.
  return jsonOk(
    { matchId },
    { status: 201, headers: { Location: `/api/pertandingan/${matchId}` } },
  );
}
