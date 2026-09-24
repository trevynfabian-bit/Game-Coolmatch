CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`slot` text NOT NULL,
	`price` integer NOT NULL,
	`compatible_types` text NOT NULL,
	`modifiers` text NOT NULL,
	CONSTRAINT "attachments_harga_positif" CHECK("attachments"."price" > 0)
);
--> statement-breakpoint
CREATE TABLE `player_attachments` (
	`player_id` integer NOT NULL,
	`weapon_id` text NOT NULL,
	`attachment_id` text NOT NULL,
	`slot` text NOT NULL,
	`is_equipped` integer DEFAULT false NOT NULL,
	`purchased_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`player_id`, `weapon_id`, `attachment_id`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`attachment_id`) REFERENCES `attachments`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `player_attachments_satu_per_slot` ON `player_attachments` (`player_id`,`weapon_id`,`slot`) WHERE "player_attachments"."is_equipped" = 1;--> statement-breakpoint
CREATE TABLE `player_upgrades` (
	`player_id` integer NOT NULL,
	`weapon_id` text NOT NULL,
	`stat` text NOT NULL,
	`level` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`player_id`, `weapon_id`, `stat`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "player_upgrades_tingkat_sah" CHECK("player_upgrades"."level" >= 0)
);
--> statement-breakpoint
CREATE TABLE `weapon_upgrades` (
	`weapon_id` text NOT NULL,
	`stat` text NOT NULL,
	`level` integer NOT NULL,
	`price` integer NOT NULL,
	`bonus_percent` integer NOT NULL,
	PRIMARY KEY(`weapon_id`, `stat`, `level`),
	CONSTRAINT "weapon_upgrades_harga_positif" CHECK("weapon_upgrades"."price" > 0)
);
