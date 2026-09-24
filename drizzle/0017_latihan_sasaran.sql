CREATE TABLE `practice_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer NOT NULL,
	`weapon_id` text NOT NULL,
	`shots` integer NOT NULL,
	`hits` integer NOT NULL,
	`per_target` text DEFAULT '{}' NOT NULL,
	`duration_ms` integer NOT NULL,
	`ended_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`weapon_id`) REFERENCES `weapons`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "practice_sessions_angka_sah" CHECK("practice_sessions"."shots" > 0 AND "practice_sessions"."hits" >= 0 AND "practice_sessions"."hits" <= "practice_sessions"."shots" AND "practice_sessions"."duration_ms" >= 0)
);
--> statement-breakpoint
CREATE INDEX `practice_sessions_pemain_idx` ON `practice_sessions` (`player_id`,`ended_at`);