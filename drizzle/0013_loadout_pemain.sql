CREATE TABLE `player_loadouts` (
	`player_id` integer PRIMARY KEY NOT NULL,
	`primary_weapon_id` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`primary_weapon_id`) REFERENCES `weapons`(`id`) ON UPDATE no action ON DELETE restrict
);
