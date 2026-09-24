CREATE TABLE `map_blocks` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`map_id` text NOT NULL,
	`block_key` text NOT NULL,
	`kind` text NOT NULL,
	`pos_x` real NOT NULL,
	`pos_y` real NOT NULL,
	`pos_z` real NOT NULL,
	`size_x` real NOT NULL,
	`size_y` real NOT NULL,
	`size_z` real NOT NULL,
	`rotation_y` real DEFAULT 0 NOT NULL,
	`color` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`map_id`) REFERENCES `maps`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "map_blocks_ukuran_positif" CHECK("map_blocks"."size_x" > 0 AND "map_blocks"."size_y" > 0 AND "map_blocks"."size_z" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `map_blocks_kunci_uq` ON `map_blocks` (`map_id`,`block_key`);--> statement-breakpoint
CREATE TABLE `map_spawn_points` (
	`map_id` text NOT NULL,
	`slot` integer NOT NULL,
	`x` real NOT NULL,
	`y` real NOT NULL,
	`z` real NOT NULL,
	PRIMARY KEY(`map_id`, `slot`),
	FOREIGN KEY (`map_id`) REFERENCES `maps`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "map_spawn_points_slot_positif" CHECK("map_spawn_points"."slot" >= 0)
);
--> statement-breakpoint
ALTER TABLE `maps` ADD `floor_width` real DEFAULT 40 NOT NULL;--> statement-breakpoint
ALTER TABLE `maps` ADD `floor_depth` real DEFAULT 40 NOT NULL;--> statement-breakpoint
ALTER TABLE `maps` ADD `bounds_min_x` real DEFAULT -20 NOT NULL;--> statement-breakpoint
ALTER TABLE `maps` ADD `bounds_max_x` real DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE `maps` ADD `bounds_min_z` real DEFAULT -20 NOT NULL;--> statement-breakpoint
ALTER TABLE `maps` ADD `bounds_max_z` real DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE `maps` ADD `sky_color` text DEFAULT '#0f172a' NOT NULL;--> statement-breakpoint
ALTER TABLE `maps` ADD `fog_color` text DEFAULT '#0f172a' NOT NULL;--> statement-breakpoint
ALTER TABLE `maps` ADD `floor_color` text DEFAULT '#1e293b' NOT NULL;--> statement-breakpoint
ALTER TABLE `maps` ADD `sort_order` integer DEFAULT 0 NOT NULL;