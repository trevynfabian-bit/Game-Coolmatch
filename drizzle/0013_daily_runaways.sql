-- Kolom campuran tempur ditambahkan ke player_settings.
--
-- Baris yang sudah ada tidak punya kolom itu, jadi salinannya mengisi
-- keduanya dengan bawaan alih-alih menyalin dari kolom yang belum ada:
-- tanpa itu, migrasi ini gagal di database mana pun yang sudah berisi
-- pengaturan pemain.
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_player_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer NOT NULL,
	`effects_volume` integer DEFAULT 80 NOT NULL,
	`music_volume` integer DEFAULT 45 NOT NULL,
	`muted` integer DEFAULT false NOT NULL,
	`mix_tembakan` integer DEFAULT 100 NOT NULL,
	`mix_isi_ulang` integer DEFAULT 100 NOT NULL,
	`mix_kena` integer DEFAULT 100 NOT NULL,
	`mix_eliminasi` integer DEFAULT 100 NOT NULL,
	`mix_suasana` integer DEFAULT 50 NOT NULL,
	`quality` text DEFAULT 'sedang' NOT NULL,
	`render_scale` integer DEFAULT 100 NOT NULL,
	`show_fps` integer DEFAULT false NOT NULL,
	`sensitivity` integer DEFAULT 100 NOT NULL,
	`key_bindings` text DEFAULT '{}' NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "player_settings_volume_wajar" CHECK("__new_player_settings"."effects_volume" BETWEEN 0 AND 100 AND "__new_player_settings"."music_volume" BETWEEN 0 AND 100),
	CONSTRAINT "player_settings_campuran_wajar" CHECK("__new_player_settings"."mix_tembakan" BETWEEN 0 AND 100 AND "__new_player_settings"."mix_isi_ulang" BETWEEN 0 AND 100 AND "__new_player_settings"."mix_kena" BETWEEN 0 AND 100 AND "__new_player_settings"."mix_eliminasi" BETWEEN 0 AND 100 AND "__new_player_settings"."mix_suasana" BETWEEN 0 AND 100),
	CONSTRAINT "player_settings_skala_wajar" CHECK("__new_player_settings"."render_scale" BETWEEN 50 AND 100),
	CONSTRAINT "player_settings_sensitivitas_wajar" CHECK("__new_player_settings"."sensitivity" BETWEEN 30 AND 200),
	CONSTRAINT "player_settings_kualitas_dikenal" CHECK("__new_player_settings"."quality" IN ('rendah', 'sedang', 'tinggi'))
);
--> statement-breakpoint
INSERT INTO `__new_player_settings`("id", "player_id", "effects_volume", "music_volume", "muted", "mix_tembakan", "mix_isi_ulang", "mix_kena", "mix_eliminasi", "mix_suasana", "quality", "render_scale", "show_fps", "sensitivity", "key_bindings", "updated_at") SELECT "id", "player_id", "effects_volume", "music_volume", "muted", 100, 100, 100, 100, 50, "quality", "render_scale", "show_fps", "sensitivity", "key_bindings", "updated_at" FROM `player_settings`;--> statement-breakpoint
DROP TABLE `player_settings`;--> statement-breakpoint
ALTER TABLE `__new_player_settings` RENAME TO `player_settings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `player_settings_pemain_unik` ON `player_settings` (`player_id`);