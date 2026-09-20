CREATE TABLE `player_stats` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer NOT NULL,
	`matches_played` integer DEFAULT 0 NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`total_kills` integer DEFAULT 0 NOT NULL,
	`total_deaths` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "player_stats_angka_wajar" CHECK("player_stats"."matches_played" >= 0 AND "player_stats"."wins" >= 0 AND "player_stats"."total_kills" >= 0 AND "player_stats"."total_deaths" >= 0),
	CONSTRAINT "player_stats_menang_masuk_akal" CHECK("player_stats"."wins" <= "player_stats"."matches_played")
);
--> statement-breakpoint
CREATE UNIQUE INDEX `player_stats_pemain_unik` ON `player_stats` (`player_id`);--> statement-breakpoint
CREATE TABLE `player_weapons` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer NOT NULL,
	`weapon_id` text NOT NULL,
	`is_unlocked` integer DEFAULT false NOT NULL,
	`unlocked_at` integer,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`weapon_id`) REFERENCES `weapons`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "player_weapons_waktu_sepakat" CHECK(("player_weapons"."is_unlocked" = 1 AND "player_weapons"."unlocked_at" IS NOT NULL) OR ("player_weapons"."is_unlocked" = 0 AND "player_weapons"."unlocked_at" IS NULL))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `player_weapons_pasangan_unik` ON `player_weapons` (`player_id`,`weapon_id`);--> statement-breakpoint
CREATE INDEX `player_weapons_pemain_idx` ON `player_weapons` (`player_id`);--> statement-breakpoint
CREATE TABLE `weapons` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`damage` integer NOT NULL,
	`fire_rate` integer NOT NULL,
	`magazine_size` integer NOT NULL,
	`image_url` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_available` integer DEFAULT true NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "weapons_type_dikenal" CHECK("weapons"."type" IN ('pistol', 'smg', 'rifle', 'shotgun', 'sniper')),
	CONSTRAINT "weapons_angka_wajar" CHECK("weapons"."damage" > 0 AND "weapons"."fire_rate" > 0 AND "weapons"."magazine_size" > 0)
);
--> statement-breakpoint
CREATE INDEX `weapons_katalog_idx` ON `weapons` (`is_available`,`sort_order`);