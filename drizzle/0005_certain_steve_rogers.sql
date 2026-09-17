-- Menyimpan peta terakhir yang dipilih tiap pemain.
--
-- Tabel baru, jadi tidak ada tabel lama yang disalin ulang dan tidak ada data
-- yang bisa hilang — berbeda dari migrasi 0003 dan 0004 yang harus berhati-hati
-- karena menyentuh tabel yang sudah diacu kunci asing.
--
-- Indeks uniknya bukan sekadar penjaga: penyimpanannya ditulis sebagai satu
-- upsert, dan upsert butuh sasaran konflik.

CREATE TABLE `map_selections` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer NOT NULL,
	`map_id` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`map_id`) REFERENCES `maps`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `map_selections_pemain_unik` ON `map_selections` (`player_id`);