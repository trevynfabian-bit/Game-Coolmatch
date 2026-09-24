CREATE TABLE `player_stats` (
	`player_id` integer PRIMARY KEY NOT NULL,
	`matches_played` integer DEFAULT 0 NOT NULL,
	`wins` integer DEFAULT 0 NOT NULL,
	`losses` integer DEFAULT 0 NOT NULL,
	`draws` integer DEFAULT 0 NOT NULL,
	`abandoned` integer DEFAULT 0 NOT NULL,
	`kills` integer DEFAULT 0 NOT NULL,
	`deaths` integer DEFAULT 0 NOT NULL,
	`round_wins` integer DEFAULT 0 NOT NULL,
	`best_streak` integer DEFAULT 0 NOT NULL,
	`coins_earned` integer DEFAULT 0 NOT NULL,
	`last_played_at` integer,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "player_stats_konsisten" CHECK("player_stats"."wins" + "player_stats"."losses" + "player_stats"."draws" + "player_stats"."abandoned" = "player_stats"."matches_played" AND "player_stats"."kills" >= 0 AND "player_stats"."deaths" >= 0)
);
