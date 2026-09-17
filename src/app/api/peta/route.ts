import { jsonOk } from "@/server/api/json";
import { listPlayableMaps } from "@/server/maps/map-store";

/**
 * Daftar peta yang bisa dimainkan.
 *
 * Inilah yang menggantikan katalog tiruan di layar Pilih Peta. Yang dikirim
 * hanya keterangannya — nama, deskripsi, ukuran, daya tampung — tanpa satu pun
 * balok arena: geometri tetap di kode klien karena dibaca juga oleh penyelesai
 * tabrakan dan kanvas 3D, dan memadukannya lewat `id` jauh lebih murah
 * daripada mengirim puluhan balok yang tidak dibutuhkan untuk memilih peta.
 *
 * Dipaksa dinamis dengan alasan yang sama seperti endpoint lain: handler ini
 * membaca database lewat better-sqlite3, modul asli yang hanya berjalan di
 * runtime Node. Tanpa ini, jawaban yang dibekukan saat build akan menyajikan
 * katalog yang sudah usang — termasuk peta yang sejak itu ditarik.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(): Response {
  return jsonOk({ maps: listPlayableMaps() });
}
