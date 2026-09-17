import { notInArray, sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { MOCK_MAPS } from "@/lib/mock/maps";
import { maps } from "@/server/db/schema";
import type { ArenaMapInfo } from "@/types/game";

/**
 * Bagian peta yang benar-benar disimpan.
 *
 * Geometri arenanya tidak ikut: balok, titik spawn, dan pencahayaan tetap di
 * kode karena dibaca juga oleh penyelesai tabrakan dan kanvas 3D. Yang ikut
 * hanyalah JUMLAH titik spawn, karena itulah yang menentukan daya tampung
 * lawan dan server perlu bisa menolak jumlah yang tidak muat.
 */
export type CatalogueMap = Pick<
  ArenaMapInfo,
  "id" | "name" | "description" | "previewUrl" | "floorSize" | "spawnPoints"
>;

/**
 * Menulis seluruh katalog peta ke database, urut sesuai urutan katalognya.
 *
 * Inilah SATU-SATUNYA jalur yang menulis baris peta. Sebelumnya jalur mulai-
 * pertandingan ikut menulisnya dari nama dan deskripsi yang dikirim klien,
 * sehingga tiap pertandingan menimpa keterangan katalog dengan apa pun yang
 * kebetulan terkirim. Katalog memang hanya punya arti bila seluruhnya terlihat
 * sekaligus: urutan tampil dan status "masih bisa dimainkan" tidak bisa
 * ditentukan dari satu peta saja.
 *
 * Peta yang hilang dari katalog ditandai tidak bisa dimainkan, BUKAN dihapus:
 * barisnya masih diacu pertandingan lama dengan ON DELETE restrict, dan
 * riwayat yang menyebut arena yang sudah tidak ada lebih buruk daripada baris
 * yang tidak lagi muncul di daftar pilihan.
 *
 * Seluruhnya dalam satu transaksi supaya katalog tidak pernah terbaca dalam
 * keadaan separuh tersinkron — misalnya semua peta ditandai tidak bisa
 * dimainkan sementara yang baru belum sempat ditulis.
 */
export function syncMapCatalogue(catalogue: readonly CatalogueMap[]): void {
  const now = Date.now();

  db.transaction((tx) => {
    for (const [index, map] of catalogue.entries()) {
      const [width, depth] = map.floorSize;
      const row = {
        id: map.id,
        name: map.name,
        description: map.description,
        previewUrl: map.previewUrl,
        floorWidth: Math.round(width),
        floorDepth: Math.round(depth),
        spawnPointCount: map.spawnPoints.length,
        sortOrder: index,
        isPlayable: true,
        updatedAt: now,
      };

      tx.insert(maps)
        .values(row)
        .onConflictDoUpdate({ target: maps.id, set: row })
        .run();
    }

    const ids = catalogue.map((map) => map.id);
    if (ids.length === 0) return;

    tx.update(maps)
      .set({ isPlayable: false, updatedAt: now })
      .where(notInArray(maps.id, ids))
      .run();
  });
}

let katalogTersinkron = false;

/**
 * Memastikan katalog peta sudah tertulis, sekali per proses.
 *
 * Katalognya statis — ia hanya berubah bila kodenya berubah, dan kode yang
 * berubah berarti proses baru — jadi menyinkronkannya ulang pada tiap
 * permintaan hanya menambah tulisan tanpa menambah kebenaran. Penanda proses
 * ini yang menahannya, dengan pola yang sama seperti `ensureLocalPlayer`:
 * dikerjakan saat pertama kali dibutuhkan, bukan lewat migrasi berisi data.
 *
 * Kalau penulisannya gagal, penandanya TIDAK dinaikkan, sehingga permintaan
 * berikutnya mencoba lagi alih-alih berjalan di atas katalog yang separuh jadi.
 */
export function ensureMapCatalogue(): void {
  if (katalogTersinkron) return;
  syncMapCatalogue(MOCK_MAPS);
  katalogTersinkron = true;
}

/**
 * Benar bila peta itu ada di katalog dan masih boleh dimainkan.
 *
 * Memanggil `ensureMapCatalogue` lebih dulu supaya jawabannya tidak bergantung
 * pada apakah kebetulan sudah ada pertandingan sebelumnya di proses ini.
 */
export function isPlayableMap(mapId: string): boolean {
  ensureMapCatalogue();
  const [row] = db
    .select({ isPlayable: maps.isPlayable })
    .from(maps)
    .where(sql`${maps.id} = ${mapId}`)
    .limit(1)
    .all();
  return row?.isPlayable === true;
}

/**
 * Daya tampung lawan sebuah peta: titik spawn-nya dikurangi satu, karena satu
 * titik dipakai pemain sendiri. Nol berarti petanya belum pernah disinkronkan.
 */
export function maxBotsForStoredMap(mapId: string): number {
  const [row] = db
    .select({ spawnPointCount: maps.spawnPointCount })
    .from(maps)
    .where(sql`${maps.id} = ${mapId}`)
    .limit(1)
    .all();
  return Math.max(0, (row?.spawnPointCount ?? 0) - 1);
}

/** Nama peta yang tersimpan, atau null bila petanya belum pernah dipakai. */
export function findMapName(mapId: string): string | null {
  const [row] = db
    .select({ name: maps.name })
    .from(maps)
    .where(sql`${maps.id} = ${mapId}`)
    .limit(1)
    .all();
  return row?.name ?? null;
}
