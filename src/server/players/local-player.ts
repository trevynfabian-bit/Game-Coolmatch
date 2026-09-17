import { asc } from "drizzle-orm";
import { db } from "@/server/db/client";
import { players, type PlayerRow } from "@/server/db/schema";

/** Nama awal pemain lokal; diganti pemain sendiri lewat fitur "Nama Pemain". */
const SEED_NAME = "Kamu";

/**
 * Pemain yang sedang bermain di perangkat ini.
 *
 * Game ini masih single-player dan belum punya profil, jadi seluruh data
 * server bergantung pada satu baris pemain yang dibuat saat pertama kali
 * dibutuhkan. Fitur "Nama Pemain" pada fase berikutnya menggantikan isi fungsi
 * ini dengan pencarian profil sungguhan; karena setiap pemanggil sudah lewat
 * sini, penggantinya cukup dilakukan di satu tempat.
 *
 * Yang dicari adalah baris pemain PERTAMA, bukan baris yang namanya "Kamu".
 * Bedanya penting: begitu pemain mengganti namanya nanti, pencarian berdasarkan
 * nama tidak akan menemukannya lagi dan diam-diam membuat pemain kedua,
 * sehingga pengaturan dan riwayatnya seolah hilang.
 */
export function ensureLocalPlayer(): PlayerRow {
  const existing = db.select().from(players).orderBy(asc(players.id)).limit(1).all();
  if (existing[0]) return existing[0];

  // onConflictDoNothing menahan kasus dua permintaan pertama yang datang
  // bersamaan: yang kalah cepat tidak gagal, ia hanya membaca baris yang sudah
  // dibuat yang menang.
  db.insert(players).values({ name: SEED_NAME }).onConflictDoNothing().run();

  const [row] = db.select().from(players).orderBy(asc(players.id)).limit(1).all();
  if (!row) {
    throw new Error("Pemain lokal gagal dibuat");
  }
  return row;
}
