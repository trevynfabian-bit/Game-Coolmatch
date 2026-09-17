-- Menambahkan batasan CHECK ke matches, match_rounds, dan match_scores.
--
-- SQLite tidak punya ALTER TABLE ADD CONSTRAINT, jadi ketiga tabel harus
-- disalin ulang. Migrasi yang dihasilkan drizzle-kit untuk ini MENGHAPUS DATA:
-- ia mengandalkan `PRAGMA foreign_keys=OFF`, padahal migrator menjalankan
-- seluruh berkas di dalam satu transaksi dan PRAGMA itu tidak berlaku di dalam
-- transaksi. Akibatnya `DROP TABLE matches` dijalankan dengan kunci asing
-- AKTIF, dan karena match_rounds serta match_scores mengacu ke sana dengan
-- ON DELETE CASCADE, seluruh ronde dan skor ikut terhapus.
--
-- Berkas ini karena itu ditulis tangan dengan urutan yang tidak pernah
-- men-drop tabel yang sedang diacu siapa pun:
--   1. match_rounds & match_scores disalin ke bentuk TANPA kunci asing,
--   2. matches disalin ulang — kini tidak ada yang mengacu ke sana,
--   3. kedua tabel anak disalin ulang sekali lagi, dengan kunci asingnya.
-- Semua langkah memindahkan datanya, jadi riwayat pertandingan tetap utuh.

-- 1a. match_rounds sementara tanpa kunci asing.
CREATE TABLE `__lepas_match_rounds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` integer NOT NULL,
	`round_number` integer NOT NULL,
	`winner_name` text,
	`ended_reason` text NOT NULL,
	`player_kills` integer DEFAULT 0 NOT NULL,
	`ended_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);--> statement-breakpoint
INSERT INTO `__lepas_match_rounds` SELECT `id`, `match_id`, `round_number`, `winner_name`, `ended_reason`, `player_kills`, `ended_at` FROM `match_rounds`;--> statement-breakpoint
DROP TABLE `match_rounds`;--> statement-breakpoint

-- 1b. match_scores sementara tanpa kunci asing.
CREATE TABLE `__lepas_match_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` integer NOT NULL,
	`participant_name` text NOT NULL,
	`is_bot` integer DEFAULT true NOT NULL,
	`color` text DEFAULT '#94a3b8' NOT NULL,
	`kills` integer DEFAULT 0 NOT NULL,
	`deaths` integer DEFAULT 0 NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`round_wins` integer DEFAULT 0 NOT NULL,
	`is_winner` integer DEFAULT false NOT NULL
);--> statement-breakpoint
INSERT INTO `__lepas_match_scores` SELECT `id`, `match_id`, `participant_name`, `is_bot`, `color`, `kills`, `deaths`, `score`, `round_wins`, `is_winner` FROM `match_scores`;--> statement-breakpoint
DROP TABLE `match_scores`;--> statement-breakpoint

-- 2. matches kini bebas dari pengacu, jadi aman disalin ulang.
CREATE TABLE `__new_matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer NOT NULL,
	`map_id` text NOT NULL,
	`difficulty` text NOT NULL,
	`bot_count` integer NOT NULL,
	`total_rounds` integer NOT NULL,
	`score_limit` integer NOT NULL,
	`round_seconds` integer NOT NULL,
	`result` text,
	`winner_name` text,
	`started_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`ended_at` integer,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`map_id`) REFERENCES `maps`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "matches_difficulty_dikenal" CHECK("__new_matches"."difficulty" IN ('santai', 'normal', 'susah')),
	CONSTRAINT "matches_result_dikenal" CHECK("__new_matches"."result" IN ('menang', 'kalah', 'seri', 'ditinggal')),
	CONSTRAINT "matches_aturan_wajar" CHECK("__new_matches"."bot_count" > 0 AND "__new_matches"."total_rounds" > 0 AND "__new_matches"."score_limit" > 0 AND "__new_matches"."round_seconds" > 0)
);--> statement-breakpoint
INSERT INTO `__new_matches` SELECT `id`, `player_id`, `map_id`, `difficulty`, `bot_count`, `total_rounds`, `score_limit`, `round_seconds`, `result`, `winner_name`, `started_at`, `ended_at` FROM `matches`;--> statement-breakpoint
DROP TABLE `matches`;--> statement-breakpoint
ALTER TABLE `__new_matches` RENAME TO `matches`;--> statement-breakpoint
CREATE INDEX `matches_pemain_waktu_idx` ON `matches` (`player_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `matches_peta_idx` ON `matches` (`map_id`);--> statement-breakpoint

-- 3a. match_rounds dikembalikan, lengkap dengan kunci asing dan batasannya.
CREATE TABLE `match_rounds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` integer NOT NULL,
	`round_number` integer NOT NULL,
	`winner_name` text,
	`ended_reason` text NOT NULL,
	`player_kills` integer DEFAULT 0 NOT NULL,
	`ended_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "match_rounds_sebab_dikenal" CHECK("match_rounds"."ended_reason" IN ('batas_kill', 'waktu_habis', 'ditinggal')),
	CONSTRAINT "match_rounds_angka_wajar" CHECK("match_rounds"."round_number" > 0 AND "match_rounds"."player_kills" >= 0)
);--> statement-breakpoint
INSERT INTO `match_rounds` SELECT * FROM `__lepas_match_rounds`;--> statement-breakpoint
DROP TABLE `__lepas_match_rounds`;--> statement-breakpoint
CREATE UNIQUE INDEX `match_rounds_nomor_unik` ON `match_rounds` (`match_id`,`round_number`);--> statement-breakpoint

-- 3b. match_scores dikembalikan dengan cara yang sama.
CREATE TABLE `match_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` integer NOT NULL,
	`participant_name` text NOT NULL,
	`is_bot` integer DEFAULT true NOT NULL,
	`color` text DEFAULT '#94a3b8' NOT NULL,
	`kills` integer DEFAULT 0 NOT NULL,
	`deaths` integer DEFAULT 0 NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`round_wins` integer DEFAULT 0 NOT NULL,
	`is_winner` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "match_scores_perolehan_wajar" CHECK("match_scores"."kills" >= 0 AND "match_scores"."deaths" >= 0 AND "match_scores"."score" >= 0 AND "match_scores"."round_wins" >= 0)
);--> statement-breakpoint
INSERT INTO `match_scores` SELECT * FROM `__lepas_match_scores`;--> statement-breakpoint
DROP TABLE `__lepas_match_scores`;--> statement-breakpoint
CREATE UNIQUE INDEX `match_scores_peserta_unik` ON `match_scores` (`match_id`,`participant_name`);
