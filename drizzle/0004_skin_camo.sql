CREATE TABLE `player_skins` (
	`player_id` integer NOT NULL,
	`skin_id` text NOT NULL,
	`purchased_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`player_id`, `skin_id`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`skin_id`) REFERENCES `skins`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE TABLE `player_weapon_skins` (
	`player_id` integer NOT NULL,
	`weapon_id` text NOT NULL,
	`skin_id` text NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`player_id`, `weapon_id`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`player_id`,`skin_id`) REFERENCES `player_skins`(`player_id`,`skin_id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `skins` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`rarity` text NOT NULL,
	`pattern` text NOT NULL,
	`colors` text NOT NULL,
	`country_code` text,
	`country_name` text,
	`price` integer NOT NULL,
	CONSTRAINT "skins_harga_positif" CHECK("skins"."price" > 0)
);
--> statement-breakpoint
CREATE INDEX `skins_tingkat_idx` ON `skins` (`rarity`);