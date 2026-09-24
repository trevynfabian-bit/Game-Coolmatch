CREATE TABLE `coin_transactions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`player_id` integer NOT NULL,
	`kind` text NOT NULL,
	`amount` integer NOT NULL,
	`balance_after` integer NOT NULL,
	`source_type` text,
	`source_id` text,
	`note` text DEFAULT '' NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "coin_transactions_bukan_nol" CHECK("coin_transactions"."amount" <> 0)
);
--> statement-breakpoint
CREATE INDEX `coin_transactions_pemain_waktu_idx` ON `coin_transactions` (`player_id`,`created_at`);--> statement-breakpoint
CREATE UNIQUE INDEX `coin_transactions_sumber_unik` ON `coin_transactions` (`player_id`,`kind`,`source_type`,`source_id`) WHERE "coin_transactions"."source_id" IS NOT NULL;--> statement-breakpoint
CREATE TABLE `coin_wallets` (
	`player_id` integer PRIMARY KEY NOT NULL,
	`balance` integer DEFAULT 0 NOT NULL,
	`lifetime_earned` integer DEFAULT 0 NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`player_id`) REFERENCES `players`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "coin_wallets_saldo_positif" CHECK("coin_wallets"."balance" >= 0)
);
