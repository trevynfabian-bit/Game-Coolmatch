CREATE TABLE `player_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer NOT NULL,
	`effects_volume` integer DEFAULT 80 NOT NULL,
	`music_volume` integer DEFAULT 45 NOT NULL,
	`muted` integer DEFAULT false NOT NULL,
	`quality` text DEFAULT 'sedang' NOT NULL,
	`render_scale` integer DEFAULT 100 NOT NULL,
	`show_fps` integer DEFAULT false NOT NULL,
	`sensitivity` integer DEFAULT 100 NOT NULL,
	`key_bindings` text DEFAULT '{}' NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "player_settings_volume_wajar" CHECK("player_settings"."effects_volume" BETWEEN 0 AND 100 AND "player_settings"."music_volume" BETWEEN 0 AND 100),
	CONSTRAINT "player_settings_skala_wajar" CHECK("player_settings"."render_scale" BETWEEN 50 AND 100),
	CONSTRAINT "player_settings_sensitivitas_wajar" CHECK("player_settings"."sensitivity" BETWEEN 30 AND 200),
	CONSTRAINT "player_settings_kualitas_dikenal" CHECK("player_settings"."quality" IN ('rendah', 'sedang', 'tinggi'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `player_settings_pemain_unik` ON `player_settings` (`player_id`);