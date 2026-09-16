import type { Config } from "drizzle-kit";

/**
 * Konfigurasi drizzle-kit untuk membuat dan menerapkan migrasi.
 *
 * Lokasi berkas database dibaca dari DATABASE_PATH agar sama persis dengan yang
 * dipakai aplikasi (lihat src/server/db/client.ts).
 */
export default {
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  dialect: "sqlite",
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? "data/arena.db",
  },
  strict: true,
  verbose: true,
} satisfies Config;
