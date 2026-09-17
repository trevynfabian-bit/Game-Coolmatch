import { jsonError, jsonOk, readJsonBody } from "@/server/api/json";
import {
  loadOpponentSettings,
  parseOpponentSettings,
  saveOpponentSettings,
} from "@/server/opponents/settings-store";
import { ensureLocalPlayer } from "@/server/players/local-player";

/**
 * Endpoint pengaturan lawan: memuat dan menyimpan tingkat kesulitan serta
 * jumlah musuh otomatis pilihan pemain.
 *
 * Dipaksa dinamis. Handler ini membaca database lewat better-sqlite3, yang
 * merupakan modul asli dan hanya bisa berjalan di runtime Node — bukan sesuatu
 * yang boleh dievaluasi saat build untuk dijadikan jawaban statis. Tanpa baris
 * ini, jawaban yang dibekukan pada saat build akan menyajikan pengaturan lama
 * kepada setiap pemain.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Pengaturan yang tersimpan, atau bawaan bila pemain belum pernah memilih. */
export function GET(): Response {
  const player = ensureLocalPlayer();
  return jsonOk(loadOpponentSettings(player.id));
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

  const player = ensureLocalPlayer();
  return jsonOk(saveOpponentSettings(player.id, parsed.value));
}
