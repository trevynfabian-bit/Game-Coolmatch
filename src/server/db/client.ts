import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import * as schema from "@/server/db/schema";

/**
 * Lokasi berkas database. Bisa ditimpa lewat DATABASE_PATH — berguna untuk
 * pengujian, dan nanti untuk lingkungan yang berkas tulisnya di tempat lain.
 */
const DEFAULT_PATH = "data/arena.db";

function resolveDatabasePath(): string {
  return resolve(process.cwd(), process.env.DATABASE_PATH ?? DEFAULT_PATH);
}

function createConnection() {
  const path = resolveDatabasePath();

  // Berkas database boleh berada di folder yang belum ada, misalnya pada clone
  // baru yang folder data-nya tidak ikut masuk git.
  if (path !== ":memory:") {
    mkdirSync(dirname(path), { recursive: true });
  }

  const sqlite = new Database(path);

  // Kunci asing TIDAK aktif secara bawaan di SQLite; tanpa baris ini seluruh
  // `references()` pada skema hanya jadi hiasan.
  sqlite.pragma("foreign_keys = ON");
  // WAL membuat pembacaan tidak terblokir penulisan — penting karena hasil
  // pertandingan ditulis tepat saat riwayat mungkin sedang dibaca.
  sqlite.pragma("journal_mode = WAL");

  return drizzle(sqlite, { schema });
}

type Db = ReturnType<typeof createConnection>;

/**
 * Koneksi database dipakai bersama satu proses.
 *
 * Disimpan pada globalThis supaya hot reload Next.js di mode pengembangan tidak
 * membuka koneksi baru tiap kali modul dimuat ulang, yang lama-lama menghabiskan
 * pegangan berkas.
 */
const globalForDb = globalThis as unknown as { __arenaDb?: Db };

/**
 * Membuka koneksi saat PERTAMA KALI dipakai, bukan saat modulnya dimuat.
 *
 * Bedanya menentukan siapa yang bisa menangani kegagalannya. Membuka berkas
 * database bisa gagal — berkasnya rusak, foldernya tidak bisa ditulis, atau
 * proses lain menguncinya — dan kalau itu terjadi saat modul dimuat, kegagalan
 * terlempar sebelum satu baris pun kode endpoint berjalan: seluruh rute
 * menjawab 500 dan tidak ada nilai cadangan yang sempat dipakai. Ditunda sampai
 * kueri pertama, kegagalannya jatuh di dalam `readOr` dan `guardWrite`, tempat
 * ia bisa jadi jawaban yang masuk akal.
 *
 * Kegagalannya tidak disimpan: percobaan berikutnya membuka lagi. Berkas yang
 * terkunci sesaat tidak boleh membuat prosesnya menyerah selamanya.
 */
function connection(): Db {
  const existing = globalForDb.__arenaDb;
  if (existing) return existing;

  const dibuat = createConnection();
  globalForDb.__arenaDb = dibuat;
  return dibuat;
}

/**
 * Koneksi yang dipakai seluruh aplikasi.
 *
 * Perantara, bukan koneksi itu sendiri, semata supaya pembukaannya bisa
 * ditunda tanpa setiap pemanggil harus berubah jadi `getDb().select(...)`.
 * Fungsinya diikat ke koneksi asli, sehingga apa pun yang di dalam Drizzle
 * mengandalkan `this` tetap menemukan objek yang benar.
 */
export const db = new Proxy({} as Db, {
  get(_target, prop, receiver) {
    const real = connection();
    const value = Reflect.get(real as object, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
}) as Db;

export { schema };
