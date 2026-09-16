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

/**
 * Koneksi database dipakai bersama satu proses.
 *
 * Disimpan pada globalThis supaya hot reload Next.js di mode pengembangan tidak
 * membuka koneksi baru tiap kali modul dimuat ulang, yang lama-lama menghabiskan
 * pegangan berkas.
 */
const globalForDb = globalThis as unknown as {
  __arenaDb?: ReturnType<typeof createConnection>;
};

export const db = globalForDb.__arenaDb ?? createConnection();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__arenaDb = db;
}

export { schema };
