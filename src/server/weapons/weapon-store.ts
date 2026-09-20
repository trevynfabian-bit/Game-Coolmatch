import { inArray, notInArray, sql } from "drizzle-orm";
import { MOCK_WEAPONS } from "@/lib/mock/weapons";
import { db } from "@/server/db/client";
import { weapons } from "@/server/db/schema";
import type { Weapon } from "@/types/game";

/**
 * Bagian senjata yang benar-benar disimpan.
 *
 * Angka penyetel rasa tembak tidak ikut: sebaran, sentakan, lama isi ulang,
 * dan jumlah butir dibaca sistem tembak di browser tiap frame, dan menyalinnya
 * ke database berarti dua sumber yang bisa berselisih — yang kalah adalah rasa
 * tembakan yang tidak lagi cocok dengan angka yang tertulis di layar.
 */
export type CatalogueWeapon = Pick<
  Weapon,
  "id" | "name" | "type" | "damage" | "fireRate" | "magazineSize" | "imageUrl"
>;

/**
 * Menulis seluruh katalog senjata ke database, urut sesuai urutan katalognya.
 *
 * Inilah SATU-SATUNYA jalur yang menulis baris senjata, sama seperti katalog
 * peta. Katalog hanya punya arti bila seluruhnya terlihat sekaligus: urutan
 * tampil dan status "masih tersedia" tidak bisa ditentukan dari satu senjata
 * saja.
 *
 * Senjata yang hilang dari katalog ditandai tidak tersedia, BUKAN dihapus.
 * Barisnya masih diacu `player_weapons` dengan ON DELETE restrict, dan koleksi
 * yang tiba-tiba kehilangan senjata yang pernah dibuka pemain lebih buruk
 * daripada baris yang tidak lagi muncul di daftar pilihan.
 *
 * Seluruhnya dalam satu transaksi supaya katalog tidak pernah terbaca separuh
 * tersinkron.
 */
export function syncWeaponCatalogue(
  catalogue: readonly CatalogueWeapon[],
): void {
  const now = Date.now();

  db.transaction((tx) => {
    for (const [index, weapon] of catalogue.entries()) {
      const row = {
        id: weapon.id,
        name: weapon.name,
        type: weapon.type,
        damage: weapon.damage,
        fireRate: weapon.fireRate,
        magazineSize: weapon.magazineSize,
        imageUrl: weapon.imageUrl,
        sortOrder: index,
        isAvailable: true,
        updatedAt: now,
      };

      tx.insert(weapons)
        .values(row)
        .onConflictDoUpdate({ target: weapons.id, set: row })
        .run();
    }

    const ids = catalogue.map((weapon) => weapon.id);
    if (ids.length === 0) return;

    tx.update(weapons)
      .set({ isAvailable: false, updatedAt: now })
      .where(notInArray(weapons.id, ids))
      .run();
  });
}

/**
 * Penanda bahwa katalog sudah disinkronkan pada proses ini.
 *
 * Katalognya hidup di kode, jadi isinya tidak bisa berubah selama proses
 * berjalan — menyinkronkannya ulang pada tiap permintaan hanya menambah
 * tulisan tanpa menambah kebenaran. Polanya sama dengan `ensureMapCatalogue`.
 */
let katalogTersinkron = false;

/**
 * Memastikan katalog senjata ada di database.
 *
 * Dipanggil oleh apa pun yang mengacu ke `weapons`, sebab kunci asing
 * `player_weapons.weapon_id` menolak senjata yang belum tercatat. Kalau
 * penulisannya gagal, penandanya TIDAK dinaikkan, sehingga permintaan
 * berikutnya mencoba lagi alih-alih berjalan di atas katalog separuh jadi.
 */
export function ensureWeaponCatalogue(): void {
  if (katalogTersinkron) return;
  syncWeaponCatalogue(MOCK_WEAPONS);
  katalogTersinkron = true;
}

/** Senjata katalog yang masih tersedia, urut tampil. */
export function listAvailableWeaponIds(): string[] {
  ensureWeaponCatalogue();
  return db
    .select({ id: weapons.id })
    .from(weapons)
    .where(sql`${weapons.isAvailable} = 1`)
    .orderBy(weapons.sortOrder)
    .all()
    .map((row) => row.id);
}

/** Benar bila seluruh id yang disebut memang ada di katalog. */
export function weaponsExist(ids: readonly string[]): boolean {
  if (ids.length === 0) return true;
  const found = db
    .select({ id: weapons.id })
    .from(weapons)
    .where(inArray(weapons.id, [...ids]))
    .all();
  return found.length === ids.length;
}
