CREATE TABLE `killstreak_loadouts` (
	`player_id` integer PRIMARY KEY NOT NULL,
	`slot1` text,
	`slot2` text,
	`slot3` text,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `killstreak_rewards` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kills_required` integer NOT NULL,
	`duration_seconds` integer NOT NULL,
	`unlock_price` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "killstreak_rewards_kill_positif" CHECK("killstreak_rewards"."kills_required" > 0),
	CONSTRAINT "killstreak_rewards_harga_sah" CHECK("killstreak_rewards"."unlock_price" >= 0)
);
--> statement-breakpoint
CREATE TABLE `match_killstreak_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`match_id` integer NOT NULL,
	`reward_id` text NOT NULL,
	`kind` text NOT NULL,
	`streak` integer DEFAULT 0 NOT NULL,
	`at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`match_id`) REFERENCES `matches`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `match_killstreak_events_pertandingan_idx` ON `match_killstreak_events` (`match_id`,`kind`);--> statement-breakpoint
CREATE TABLE `player_killstreak_unlocks` (
	`player_id` integer NOT NULL,
	`reward_id` text NOT NULL,
	`unlocked_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	PRIMARY KEY(`player_id`, `reward_id`),
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reward_id`) REFERENCES `killstreak_rewards`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
ALTER TABLE `matches` ADD `best_streak` integer DEFAULT 0 NOT NULL;