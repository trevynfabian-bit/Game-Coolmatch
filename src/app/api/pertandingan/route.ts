import { guardWrite } from "@/server/api/fallback";
import { jsonError, jsonOk, readJsonBody } from "@/server/api/json";
import { parseStartMatch, startMatch } from "@/server/matches/match-store";
import { isPlayableMap, maxBotsForStoredMap } from "@/server/maps/map-store";
import { loadSelectedMap } from "@/server/maps/selection-store";
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

  /*
    Peta pilihan pemain yang dipakai bila permintaannya tidak menyebutkan satu.
    Itu yang membuat "mulai bertanding" berarti "mulai di peta yang tadi
    kupilih" tanpa klien harus mengingatkannya setiap kali.
  */
  const mapId = parsed.value.mapId ?? loadSelectedMap(player.id).mapId;

  /*
    Diperiksa di sini, bukan di dalam `parseStartMatch`, karena keduanya butuh
    membaca database sedangkan parser sengaja murni. Tanpa pemeriksaan ini, id
    peta yang tidak dikenal akan ditolak kunci asing jauh di dalam transaksi dan
    keluar sebagai kegagalan server — padahal penyebabnya ada di permintaannya.
  */
  if (!isPlayableMap(mapId)) {
    return jsonError(400, "Peta itu tidak ada di katalog.");
  }

  /*
    Tata letak petalah yang membatasi jumlah lawan, bukan sebaliknya. Titik
    spawn sebuah peta terbatas, dan begitu habis, dua petarung terpaksa muncul
    bertumpuk di titik yang sama — pertandingan yang rusak sejak detik pertama.
    Angkanya dibaca dari baris peta, jadi peta baru yang lebih sempit langsung
    berlaku tanpa satu pun batas tertulis di sini perlu diubah.
  */
  const muat = maxBotsForStoredMap(mapId);
  if (parsed.value.botCount > muat) {
    return jsonError(
      400,
      `Peta itu hanya muat ${muat} lawan; diminta ${parsed.value.botCount}.`,
    );
  }

  return guardWrite("POST /api/pertandingan", () => {
    const matchId = startMatch(player.id, { ...parsed.value, mapId });

    // 201 beserta lokasi sumbernya: pemanggil memakai id ini untuk mencatat
    // kejadian dan, nanti, menutup pertandingannya.
    return jsonOk(
      { matchId },
      { status: 201, headers: { Location: `/api/pertandingan/${matchId}` } },
    );
  });
}
