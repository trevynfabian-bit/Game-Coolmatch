-- Memperluas `maps` menjadi katalog peta, bukan sekadar acuan nama.
--
-- Seluruhnya ALTER TABLE ADD COLUMN, dan itu disengaja. `matches` mengacu ke
-- tabel ini dengan ON DELETE restrict, jadi menyalin ulang `maps` akan masuk
-- ke jebakan yang sama dengan migrasi 0003: migrator menjalankan berkasnya di
-- dalam satu transaksi, PRAGMA foreign_keys=OFF tidak berlaku di sana, dan
-- DROP TABLE dijalankan dengan kunci asing masih aktif. Karena itu tidak ada
-- satu pun batasan CHECK ditambahkan di sini — menambahkannya akan memaksa
-- penyalinan ulang tabel yang justru ingin dihindari.
--
-- `updated_at` dibiarkan boleh kosong karena SQLite menolak menambahkan kolom
-- NOT NULL yang nilai bawaannya tidak tetap, dan (unixepoch() * 1000) bukan
-- nilai tetap. Baris yang lebih tua daripada kolom ini memang tidak diketahui
-- kapan terakhir disegarkan.
--
-- Baris yang sudah ada tetap utuh: keenam kolom baru terisi nilai bawaannya,
-- lalu disegarkan sendiri saat katalog peta berikutnya disinkronkan.

ALTER TABLE `maps` ADD `floor_width` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `maps` ADD `floor_depth` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `maps` ADD `spawn_point_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `maps` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `maps` ADD `is_playable` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `maps` ADD `updated_at` integer;--> statement-breakpoint
CREATE INDEX `maps_katalog_idx` ON `maps` (`is_playable`,`sort_order`);