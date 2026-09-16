CREATE TABLE `maps` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text DEFAULT '' NOT NULL,
	`preview_url` text
);
--> statement-breakpoint
CREATE TABLE `match_rounds` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` integer NOT NULL,
	`round_number` integer NOT NULL,
	`winner_name` text,
	`ended_reason` text NOT NULL,
	`player_kills` integer DEFAULT 0 NOT NULL,
	`ended_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `match_rounds_nomor_unik` ON `match_rounds` (`match_id`,`round_number`);--> statement-breakpoint
CREATE TABLE `match_scores` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` integer NOT NULL,
	`participant_name` text NOT NULL,
	`is_bot` integer DEFAULT true NOT NULL,
	`kills` integer DEFAULT 0 NOT NULL,
	`deaths` integer DEFAULT 0 NOT NULL,
	`score` integer DEFAULT 0 NOT NULL,
	`round_wins` integer DEFAULT 0 NOT NULL,
	`is_winner` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `match_scores_peserta_unik` ON `match_scores` (`match_id`,`participant_name`);--> statement-breakpoint
CREATE TABLE `matches` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer NOT NULL,
	`map_id` text NOT NULL,
	`difficulty` text NOT NULL,
	`bot_count` integer NOT NULL,
	`total_rounds` integer NOT NULL,
	`score_limit` integer NOT NULL,
	`round_seconds` integer NOT NULL,
	`result` text,
	`winner_name` text,
	`started_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`ended_at` integer,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`map_id`) REFERENCES `maps`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `matches_pemain_waktu_idx` ON `matches` (`player_id`,`started_at`);--> statement-breakpoint
CREATE INDEX `matches_peta_idx` ON `matches` (`map_id`);--> statement-breakpoint
CREATE TABLE `players` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `players_name_unik` ON `players` (`name`);