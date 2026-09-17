import { jsonError, jsonOk, readJsonBody } from "@/server/api/json";
import { ensureLocalPlayer } from "@/server/players/local-player";
import {
  loadPlayerProfile,
  parsePlayerName,
  savePlayerName,
} from "@/server/players/profile-store";

/**
 * Endpoint nama pemain: memuat dan menyimpan nama yang muncul di papan skor
 * dan kill feed, sehingga ia bertahan lintas perangkat alih-alih hanya hidup
 * di localStorage satu peramban.
 *
 * Dipaksa dinamis dengan alasan yang sama seperti endpoint lain: handler ini
 * membaca database lewat better-sqlite3, modul asli yang hanya berjalan di
 * runtime Node, dan jawaban yang dibekukan saat build akan menyajikan nama
 * lama kepada setiap pemain.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Nama tersimpan, atau nama bawaan bila pemain belum pernah menamainya. */
export function GET(): Response {
  const player = ensureLocalPlayer();
  return jsonOk(loadPlayerProfile(player.id));
}

/**
 * Menyimpan nama pemain.
 *
 * PUT, bukan POST: permintaan ini menetapkan nama ke nilai yang dikirim, dan
 * mengirimkannya dua kali berakhir sama dengan sekali.
 */
export async function PUT(request: Request): Promise<Response> {
  const body = await readJsonBody(request);
  if (!body.ok) {
    return jsonError(400, "Badan permintaan bukan JSON yang sah.");
  }

  const parsed = parsePlayerName(body.body);
  if (!parsed.ok) {
    return jsonError(400, parsed.message);
  }

  const player = ensureLocalPlayer();
  const saved = savePlayerName(player.id, parsed.value);
  if (!saved.ok) {
    return jsonError(400, saved.message);
  }

  return jsonOk(saved.profile);
}
