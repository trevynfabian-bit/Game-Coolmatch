ALTER TABLE `match_scores` ADD `damage_dealt` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `match_scores` ADD `damage_taken` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `match_scores` ADD `hits_landed` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `match_scores` ADD `headshots` integer DEFAULT 0 NOT NULL;