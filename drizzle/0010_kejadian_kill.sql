CREATE TABLE `match_kill_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` integer NOT NULL,
	`seq` integer NOT NULL,
	`round_number` integer NOT NULL,
	`killer_name` text NOT NULL,
	`victim_name` text NOT NULL,
	`weapon_name` text NOT NULL,
	`is_headshot` integer DEFAULT false NOT NULL,
	`at_second` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "match_kill_events_urutan_positif" CHECK("match_kill_events"."seq" >= 1 AND "match_kill_events"."round_number" >= 1)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `match_kill_events_urutan_uq` ON `match_kill_events` (`match_id`,`seq`);