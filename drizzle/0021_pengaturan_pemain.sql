CREATE TABLE `player_settings` (
	`player_id` integer PRIMARY KEY NOT NULL,
	`quality` text DEFAULT 'sedang' NOT NULL,
	`resolution_percent` integer DEFAULT 100 NOT NULL,
	`fov` integer DEFAULT 75 NOT NULL,
	`show_fps` integer DEFAULT true NOT NULL,
	`sensitivity_centi` integer DEFAULT 100 NOT NULL,
	`bindings` text DEFAULT '{}' NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "player_settings_rentang" CHECK("player_settings"."resolution_percent" BETWEEN 50 AND 100 AND "player_settings"."fov" BETWEEN 65 AND 100 AND "player_settings"."sensitivity_centi" BETWEEN 20 AND 300)
);
