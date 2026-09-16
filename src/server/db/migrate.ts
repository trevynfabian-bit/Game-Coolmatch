import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { db } from "@/server/db/client";

/**
 * Menerapkan seluruh migrasi yang tertunda ke berkas database.
 *
 * Dijalankan lewat `npm run db:migrate`. Dipisahkan dari client.ts supaya
 * memuat koneksi database tidak diam-diam mengubah skema — migrasi harus
 * merupakan langkah yang disengaja.
 */
migrate(db, { migrationsFolder: "drizzle" });
console.log("Migrasi selesai.");
