import { jsonOk } from "@/server/api/json";
import { readOr } from "@/server/api/fallback";
import { catalogueFromCode, listPlayableMaps } from "@/server/maps/map-store";

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
  /*
    Cadangannya katalog di kode itu sendiri, bukan daftar kosong. Barisnya di
    database memang hanya salinan — aslinya ada di kode — jadi inilah satu-
    satunya bacaan yang cadangannya selengkap aslinya, dan database yang tidak
    bisa dibaca tidak perlu menghalangi siapa pun memilih peta.

    Yang hilang hanya penandaan "sudah ditarik dari katalog", dan peta yang
    ditarik toh sudah tidak ada di kode juga.
  */
  const fromCode = catalogueFromCode();
  const maps = readOr("GET /api/peta", listPlayableMaps, fromCode);

  return jsonOk({ maps, degraded: maps === fromCode });
}
