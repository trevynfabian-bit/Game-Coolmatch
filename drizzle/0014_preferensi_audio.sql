CREATE TABLE `player_audio_settings` (
	`player_id` integer PRIMARY KEY NOT NULL,
	`master_percent` integer DEFAULT 80 NOT NULL,
	`sfx_percent` integer DEFAULT 90 NOT NULL,
	`music_percent` integer DEFAULT 50 NOT NULL,
	`ui_percent` integer DEFAULT 70 NOT NULL,
	`muted` integer DEFAULT false NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "player_audio_settings_rentang_volume" CHECK("player_audio_settings"."master_percent" BETWEEN 0 AND 100 AND "player_audio_settings"."sfx_percent" BETWEEN 0 AND 100 AND "player_audio_settings"."music_percent" BETWEEN 0 AND 100 AND "player_audio_settings"."ui_percent" BETWEEN 0 AND 100)
);
