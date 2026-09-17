import { eq, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { mapSelections } from "@/server/db/schema";
import { isPlayableMap, listPlayableMaps } from "@/server/maps/map-store";

/** Bentuk yang dikirim dan diterima endpoint peta terpilih. */
export interface MapSelectionPayload {
  mapId: string;
  /** Epoch milidetik saat terakhir disimpan; null berarti masih bawaan. */
  updatedAt: number | null;
  /**
   * Benar bila pilihan tersimpan sudah tidak bisa dipakai lagi dan jawabannya
   * jatuh ke peta lain.
   *
   * Dikatakan, bukan didiamkan: pemain yang dulu memilih peta yang kini ditarik
   * akan melihat peta lain terpilih saat membuka layarnya, dan tanpa penanda
   * ini layar itu tidak punya cara menjelaskan kenapa.
   */
  fellBack: boolean;
}

export type ParsedMapSelection =
  | { ok: true; value: { mapId: string } }
  | { ok: false; message: string };

/**
 * Memeriksa badan permintaan penyimpanan peta terpilih.
 *
 * Peta yang tidak ada di katalog DITOLAK, bukan disimpan lalu dijatuhkan saat
 * dibaca. Menyimpannya berarti kunci asing menolak jauh di dalam transaksi dan
 * keluar sebagai kegagalan server, padahal penyebabnya ada di permintaannya.
 */
export function parseMapSelection(body: unknown): ParsedMapSelection {
  // Array ikut ditolak di sini dengan alasan yang sama seperti pada pengaturan
  // lawan: `typeof [] === "object"`, jadi tanpa ini sebuah array baru gagal di
  // pemeriksaan berikutnya dengan alasan yang salah.
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, message: "Badan permintaan harus berupa objek JSON." };
  }

  const { mapId } = body as Record<string, unknown>;

  if (typeof mapId !== "string" || mapId.trim() === "") {
    return { ok: false, message: "Peta harus punya id." };
  }

  if (!isPlayableMap(mapId)) {
    return {
      ok: false,
      message: `Peta "${mapId}" tidak ada di katalog atau sudah tidak bisa dimainkan.`,
    };
  }

  return { ok: true, value: { mapId } };
}

/** Peta pertama pada katalog; dipakai saat pemain belum pernah memilih. */
function defaultMapId(): string {
  const [first] = listPlayableMaps();
  if (!first) throw new Error("Katalog peta kosong");
  return first.id;
}

/**
 * Peta terakhir yang dipilih seorang pemain.
 *
 * Pemain yang belum pernah memilih mendapat peta pertama katalog dengan
 * `updatedAt` kosong, bukan jawaban 404 — belum memilih bukan keadaan galat,
 * dan layar pilih peta tetap harus bisa menyorot sesuatu.
 *
 * Pilihan yang sudah ditarik dari katalog ikut dijatuhkan ke peta pertama.
 * Barisnya sengaja TIDAK dihapus atau ditimpa di sini: membaca tidak boleh
 * menulis, dan peta yang ditarik hari ini bisa saja kembali besok — kalau
 * pilihannya dihapus, pemain kehilangan pilihannya untuk selamanya karena
 * kebetulan membuka layar itu pada hari yang salah.
 */
export function loadSelectedMap(playerId: number): MapSelectionPayload {
  const [row] = db
    .select()
    .from(mapSelections)
    .where(eq(mapSelections.playerId, playerId))
    .limit(1)
    .all();

  if (!row) {
    return { mapId: defaultMapId(), updatedAt: null, fellBack: false };
  }

  if (!isPlayableMap(row.mapId)) {
    return { mapId: defaultMapId(), updatedAt: row.updatedAt, fellBack: true };
  }

  return { mapId: row.mapId, updatedAt: row.updatedAt, fellBack: false };
}

/**
 * Menyimpan peta pilihan seorang pemain.
 *
 * Satu upsert, bukan "cari dulu lalu insert atau update", dengan alasan yang
 * sama seperti pengaturan lawan: dua permintaan yang datang hampir bersamaan
 * akan sama-sama melihat baris belum ada lalu sama-sama menyisipkan, dan yang
 * kalah cepat gagal karena indeks unik.
 */
export function saveSelectedMap(
  playerId: number,
  value: { mapId: string },
): MapSelectionPayload {
  const now = sql`(unixepoch() * 1000)`;

  const [row] = db
    .insert(mapSelections)
    .values({ playerId, mapId: value.mapId })
    .onConflictDoUpdate({
      target: mapSelections.playerId,
      set: { mapId: value.mapId, updatedAt: now },
    })
    .returning()
    .all();

  return { mapId: row.mapId, updatedAt: row.updatedAt, fellBack: false };
}
