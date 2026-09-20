import { jsonError, jsonOk } from "@/server/api/json";
import { loadOpenSession } from "@/server/matches/match-store";
import { ensureLocalPlayer } from "@/server/players/local-player";

/**
 * Sesi pertandingan pemain yang sedang BERJALAN beserta daftar pesertanya.
 *
 * Arena memakainya saat dibuka: bila ada sesi yang masih hidup, daftar
 * pesaing dan perolehannya diambil dari sini dan sesinya dilanjutkan, bukan
 * dibuka sesi baru di sebelah yang lama. Bentuknya sama persis dengan
 * GET /api/pertandingan/:id, jadi klien tidak perlu dua pembaca.
 *
 * 404 bila tidak ada sesi terbuka — itu jawaban yang wajar untuk pemain yang
 * memang tidak sedang bertanding, bukan kerusakan. Kegagalan membaca
 * database bukan "tidak ada sesi": dijawab 503 supaya klien tidak salah
 * membuka sesi baru di atas sesi yang sebetulnya masih ada.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(): Response {
  try {
    const session = loadOpenSession(ensureLocalPlayer().id);
    if (!session) {
      return jsonError(
        404,
        "Tidak ada sesi pertandingan yang sedang berjalan.",
      );
    }
    return jsonOk(session, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[GET /api/pertandingan/berjalan] gagal dibaca:", error);
    return jsonError(
      503,
      "Penyimpanan sedang tidak bisa diakses. Coba lagi sebentar lagi.",
    );
  }
}
