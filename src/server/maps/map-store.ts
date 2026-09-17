import { sql } from "drizzle-orm";
import { db } from "@/server/db/client";
import { maps } from "@/server/db/schema";
import type { ArenaMapInfo } from "@/types/game";

/** Bagian peta yang benar-benar disimpan; geometri arena tetap di kode klien. */
export type StorableMap = Pick<
  ArenaMapInfo,
  "id" | "name" | "description" | "previewUrl"
>;

/**
 * Memastikan sebuah peta punya barisnya di database.
 *
 * `matches.map_id` mengacu ke tabel `maps` dengan `onDelete: restrict`, jadi
 * menyimpan hasil pertandingan MUSTAHIL selama barisnya belum ada — dan tidak
 * ada satu pun jalur yang pernah membuatnya. Peta bukan masukan pemain
 * melainkan isi katalog di kode, jadi barisnya disisipkan saat pertama kali
 * dibutuhkan alih-alih lewat migrasi berisi data.
 *
 * Alasannya praktis: peta baru dari fase "Pilih Peta" cukup ditambahkan ke
 * katalog klien dan langsung bisa dipakai, tanpa perlu migrasi baru setiap
 * kali. Nama dan deskripsinya ikut disegarkan tiap pemanggilan supaya baris
 * lama tidak menyimpan nama yang sudah tidak dipakai lagi.
 */
export function ensureMapRow(map: StorableMap): void {
  db.insert(maps)
    .values({
      id: map.id,
      name: map.name,
      description: map.description,
      previewUrl: map.previewUrl,
    })
    .onConflictDoUpdate({
      target: maps.id,
      set: {
        name: map.name,
        description: map.description,
        previewUrl: map.previewUrl,
      },
    })
    .run();
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
