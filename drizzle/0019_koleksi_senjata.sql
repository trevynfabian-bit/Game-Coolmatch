CREATE TABLE `player_weapons` (
	`player_id` integer NOT NULL,
	`weapon_id` text NOT NULL,
	`via` text NOT NULL,
	`unlocked_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`announced_at` integer,
	PRIMARY KEY(`player_id`, `weapon_id`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`weapon_id`) REFERENCES `weapons`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `player_weapons_belum_dilihat_idx` ON `player_weapons` (`player_id`,`announced_at`);