ALTER TABLE `match_scores` ADD `weapon_id` text;--> statement-breakpoint
ALTER TABLE `matches` ADD `last_activity_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX `matches_sesi_terbuka_idx` ON `matches` (`player_id`,`ended_at`);--> statement-breakpoint
UPDATE `matches` SET `last_activity_at` = COALESCE(`ended_at`, `started_at`) WHERE `last_activity_at` = 0;
