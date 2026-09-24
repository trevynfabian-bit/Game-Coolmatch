CREATE TABLE `trial_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer NOT NULL,
	`match_id` integer NOT NULL,
	`weapon_id` text NOT NULL,
	`weapon_was_locked` integer DEFAULT false NOT NULL,
	`difficulty` text NOT NULL,
	`bot_count` integer NOT NULL,
	`shots` integer DEFAULT 0 NOT NULL,
	`hits` integer DEFAULT 0 NOT NULL,
	`headshots` integer DEFAULT 0 NOT NULL,
	`damage` integer DEFAULT 0 NOT NULL,
	`kills` integer DEFAULT 0 NOT NULL,
	`deaths` integer DEFAULT 0 NOT NULL,
	`started_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`ended_at` integer,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`weapon_id`) REFERENCES `weapons`(`id`) ON UPDATE no action ON DELETE restrict,
	CONSTRAINT "trial_sessions_angka_sah" CHECK("trial_sessions"."shots" >= 0 AND "trial_sessions"."hits" BETWEEN 0 AND "trial_sessions"."shots" AND "trial_sessions"."headshots" BETWEEN 0 AND "trial_sessions"."hits" AND "trial_sessions"."damage" >= 0 AND "trial_sessions"."kills" >= 0 AND "trial_sessions"."deaths" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `trial_sessions_pertandingan_uq` ON `trial_sessions` (`match_id`);--> statement-breakpoint
CREATE INDEX `trial_sessions_pemain_idx` ON `trial_sessions` (`player_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `trial_sessions_senjata_idx` ON `trial_sessions` (`player_id`,`weapon_id`);