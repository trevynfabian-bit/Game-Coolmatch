import { guardWrite, readOr } from "@/server/api/fallback";
import { jsonError, jsonOk, readJsonBody } from "@/server/api/json";
import { catalogueFromCode } from "@/server/maps/map-store";
import {
  loadSelectedMap,
  parseMapSelection,
  saveSelectedMap,
} from "@/server/maps/selection-store";
import { ensureLocalPlayer } from "@/server/players/local-player";

/**
 * Endpoint peta terpilih: memuat dan menyimpan peta terakhir yang dipilih
 * pemain, sehingga pilihannya bertahan lintas perangkat alih-alih hanya hidup
 * di localStorage satu peramban.
 *
 * Dipaksa dinamis dengan alasan yang sama seperti endpoint lain: handler ini
 * membaca database lewat better-sqlite3, modul asli yang hanya berjalan di
 * runtime Node — bukan sesuatu yang boleh dibekukan jadi jawaban statis saat
 * build, yang akan menyajikan pilihan lama kepada setiap pemain.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Pilihan tersimpan, atau peta pertama katalog bila pemain belum memilih. */
export function GET(): Response {
  // Cadangannya peta pertama katalog di kode — peta yang pasti ada, karena
  // katalog itulah sumber kebenarannya.
  const cadangan = {
    mapId: catalogueFromCode()[0]?.id ?? "",
    updatedAt: null,
    fellBack: false,
  };

  const selection = readOr(
    "GET /api/peta-terpilih",
    () => loadSelectedMap(ensureLocalPlayer().id),
    cadangan,
  );

  return jsonOk({ ...selection, degraded: selection === cadangan });
}

/**
 * Menyimpan pilihan pemain.
 *
 * PUT, bukan POST: permintaan ini menetapkan pilihan ke nilai yang dikirim, dan
 * mengirimkannya dua kali berakhir sama dengan sekali.
 */
export async function PUT(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(400, "Badan permintaan bukan JSON yang sah.");
  }

  const parsed = parseMapSelection(body.body);
  if (!parsed.ok) {
    return jsonError(400, parsed.message);
  }

  return guardWrite("PUT /api/peta-terpilih", () => {
    const player = ensureLocalPlayer();
    return jsonOk(saveSelectedMap(player.id, parsed.value));
  });
}
