ALTER TABLE `killstreak_rewards` ADD `unlock_stat` text;--> statement-breakpoint
ALTER TABLE `killstreak_rewards` ADD `unlock_value` integer;--> statement-breakpoint
ALTER TABLE `player_killstreak_unlocks` ADD `via` text DEFAULT 'koin' NOT NULL;--> statement-breakpoint
ALTER TABLE `player_killstreak_unlocks` ADD `announced_at` integer;