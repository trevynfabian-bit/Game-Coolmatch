CREATE TABLE `opponent_settings` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer NOT NULL,
	`difficulty` text NOT NULL,
	`bot_count` integer NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "opponent_settings_bot_count_wajar" CHECK("opponent_settings"."bot_count" BETWEEN 1 AND 8),
	CONSTRAINT "opponent_settings_difficulty_dikenal" CHECK("opponent_settings"."difficulty" IN ('santai', 'normal', 'susah'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `opponent_settings_pemain_unik` ON `opponent_settings` (`player_id`);