import { DEFAULT_MATCH_SETUP } from "@/lib/game/difficulty";
import { guardWrite, readOr } from "@/server/api/fallback";
import { jsonError, jsonOk, readJsonBody } from "@/server/api/json";
import {
  BOT_LIMITS,
  difficultyCatalogue,
} from "@/server/opponents/difficulty-catalogue";
import {
  loadOpponentSettings,
  parseOpponentSettings,
  saveOpponentSettings,
} from "@/server/opponents/settings-store";
import { ensureLocalPlayer } from "@/server/players/local-player";

/**
 * Endpoint pengaturan lawan: memuat dan menyimpan tingkat kesulitan serta
 * jumlah musuh otomatis pilihan pemain, dan menyajikan katalog tingkat
 * kesulitan — sifat tiap tingkat beserta angka perilaku turunannya — supaya
 * apa yang dipilih pemain dan apa yang dilakukan musuh datang dari definisi
 * yang sama di server.
 *
 * Dipaksa dinamis. Handler ini membaca database lewat better-sqlite3, yang
 * merupakan modul asli dan hanya bisa berjalan di runtime Node — bukan sesuatu
 * yang boleh dievaluasi saat build untuk dijadikan jawaban statis. Tanpa baris
 * ini, jawaban yang dibekukan pada saat build akan menyajikan pengaturan lama
 * kepada setiap pemain.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Pengaturan yang tersimpan, atau bawaan bila pemain belum pernah memilih,
 * beserta katalog tingkat (`levels`) dan batas jumlah musuh (`limits`).
 * Katalognya berasal dari kode, bukan database, jadi ia tetap tersaji walau
 * pilihannya tidak terbaca.
 */
export function GET(): Response {
  // Pengaturan bawaan sudah jadi jawaban yang sah untuk pemain yang belum
  // pernah memilih, jadi ia juga jawaban yang sah ketika pilihannya tidak
  // terbaca — bedanya hanya ditandai `degraded`.
  const cadangan = { ...DEFAULT_MATCH_SETUP, updatedAt: null };

  const settings = readOr(
    "GET /api/pengaturan-lawan",
    () => loadOpponentSettings(ensureLocalPlayer().id),
    cadangan,
  );

  return jsonOk({
    ...settings,
    degraded: settings === cadangan,
    levels: difficultyCatalogue(),
    limits: BOT_LIMITS,
  });
}

/**
 * Menyimpan pilihan pemain.
 *
 * PUT, bukan POST: permintaan ini menetapkan seluruh isi pengaturan ke nilai
 * yang dikirim, dan mengirimkannya dua kali berakhir sama dengan sekali.
 */
export async function PUT(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(400, "Badan permintaan bukan JSON yang sah.");
  }

  const parsed = parseOpponentSettings(body.body);
  if (!parsed.ok) {
    return jsonError(400, parsed.message);
  }

  return guardWrite("PUT /api/pengaturan-lawan", () => {
    const player = ensureLocalPlayer();
    return jsonOk(saveOpponentSettings(player.id, parsed.value));
  });
}
