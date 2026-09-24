CREATE TABLE `weapons` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`damage` integer NOT NULL,
	`fire_rate` integer NOT NULL,
	`magazine_size` integer NOT NULL,
	`reload_ms` integer NOT NULL,
	`automatic` integer DEFAULT false NOT NULL,
	`pellets` integer DEFAULT 1 NOT NULL,
	`spread_centi_deg` integer NOT NULL,
	`recoil_centi_deg` integer NOT NULL,
	`unlock_stat` text,
	`unlock_target` integer,
	`sort_order` integer DEFAULT 0 NOT NULL,
	CONSTRAINT "weapons_statistik_positif" CHECK("weapons"."damage" > 0 AND "weapons"."fire_rate" > 0 AND "weapons"."magazine_size" > 0 AND "weapons"."reload_ms" > 0 AND "weapons"."pellets" >= 1),
	CONSTRAINT "weapons_syarat_lengkap" CHECK(("weapons"."unlock_stat" IS NULL AND "weapons"."unlock_target" IS NULL) OR ("weapons"."unlock_stat" IS NOT NULL AND "weapons"."unlock_target" IS NOT NULL AND "weapons"."unlock_target" > 0))
);
