CREATE TABLE `reward_notifications` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer NOT NULL,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`body` text DEFAULT '' NOT NULL,
	`item_id` text,
	`amount` integer,
	`source_id` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`seen_at` integer,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "reward_notifications_koin_ada_jumlah" CHECK("reward_notifications"."kind" <> 'koin' OR ("reward_notifications"."amount" IS NOT NULL AND "reward_notifications"."amount" > 0)),
	CONSTRAINT "reward_notifications_judul_tidak_kosong" CHECK(length("reward_notifications"."title") > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `reward_notifications_sumber_uq` ON `reward_notifications` (`player_id`,`source_id`);--> statement-breakpoint
CREATE INDEX `reward_notifications_kotak_masuk_idx` ON `reward_notifications` (`player_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `reward_notifications_belum_dilihat_idx` ON `reward_notifications` (`player_id`,`seen_at`);