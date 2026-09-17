import { jsonError, jsonOk, readJsonBody } from "@/server/api/json";
import { parseStartMatch, startMatch } from "@/server/matches/match-store";
import { isPlayableMap } from "@/server/maps/map-store";
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

  /*
    Peta diperiksa di sini, bukan di dalam `parseStartMatch`, karena yang ini
    butuh membaca database sedangkan parser sengaja murni. Tanpa pemeriksaan
    ini, id peta yang tidak dikenal akan ditolak kunci asing jauh di dalam
    transaksi dan keluar sebagai kegagalan server — padahal penyebabnya ada di
    permintaannya.
  */
  if (!isPlayableMap(parsed.value.mapId)) {
    return jsonError(400, "Peta itu tidak ada di katalog.");
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
